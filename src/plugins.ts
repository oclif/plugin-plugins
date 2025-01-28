import {Config, Errors, Interfaces, ux} from '@oclif/core'
import {bold} from 'ansis'
import makeDebug from 'debug'
import {spawn} from 'node:child_process'
import {access, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises'
import {basename, dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {gt, valid, validRange} from 'semver'

import {LogLevel} from './log-level.js'
import {NPM} from './npm.js'
import {Output} from './spawn.js'
import {uniqWith} from './util.js'
import {Yarn} from './yarn.js'

type Plugin = Interfaces.LinkedPlugin | Interfaces.UserPlugin

type UserPJSON = {
  dependencies: Record<string, string>
  oclif: {
    plugins: Plugin[]
    schema: number
  }
  private: boolean
}

type NormalizedUserPJSON = {
  dependencies: Record<string, string>
  oclif: {
    plugins: Plugin[]
    schema: number
  }
  private: boolean
}

const initPJSON: UserPJSON = {
  dependencies: {},
  oclif: {plugins: [], schema: 1},
  private: true,
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function dedupePlugins(plugins: Plugin[]): Plugin[] {
  return uniqWith(plugins, (a, b) => a.name === b.name || (a.type === 'link' && b.type === 'link' && a.root === b.root))
}

function extractIssuesLocation(
  bugs: string | undefined | {url: string},
  repository: string | undefined | {type: string; url: string},
): string | undefined {
  if (bugs) {
    return typeof bugs === 'string' ? bugs : bugs.url
  }

  if (repository) {
    return typeof repository === 'string' ? repository : repository.url.replace('git+', '').replace('.git', '')
  }
}

function notifyUser(plugin: Config, output: Output): void {
  const containsWarnings = [...output.stdout, ...output.stderr].some((l) => l.includes('npm WARN'))
  if (containsWarnings) {
    ux.stderr(bold.yellow(`\nThese warnings can only be addressed by the owner(s) of ${plugin.name}.`))

    if (plugin.pjson.bugs || plugin.pjson.repository) {
      ux.stderr(
        `We suggest that you create an issue at ${extractIssuesLocation(
          plugin.pjson.bugs,
          plugin.pjson.repository,
        )} and ask the plugin owners to address them.\n`,
      )
    }
  }
}

export default class Plugins {
  public config: Interfaces.Config
  public readonly npm: NPM
  private readonly debug: ReturnType<typeof makeDebug>
  private readonly logLevel: LogLevel

  constructor(options: {config: Interfaces.Config; logLevel?: LogLevel}) {
    this.config = options.config
    this.debug = makeDebug('@oclif/plugin-plugins')
    this.logLevel = options.logLevel ?? 'notice'
    this.npm = new NPM({
      config: this.config,
      logLevel: this.logLevel,
    })
  }

  private get pjsonPath() {
    return join(this.config.dataDir, 'package.json')
  }

  public async add(...plugins: Plugin[]): Promise<void> {
    const pjson = await this.pjson()
    const mergedPlugins = [...(pjson.oclif.plugins || []), ...plugins] as typeof pjson.oclif.plugins
    await this.savePJSON({
      ...pjson,
      oclif: {
        ...pjson.oclif,
        plugins: dedupePlugins(mergedPlugins),
      },
    })
  }

  public friendlyName(name: string): string {
    const {pluginPrefix, scope} = this.config.pjson.oclif
    if (!scope) return name
    const match = name.match(`@${scope}/${pluginPrefix ?? 'plugin'}-(.+)`)
    return match?.[1] ?? name
  }

  public async hasPlugin(name: string): Promise<false | Plugin> {
    const list = await this.list()
    const friendlyName = this.friendlyName(name)
    const unfriendlyName = this.unfriendlyName(name) ?? name
    return (
      list.find((p) => this.friendlyName(p.name) === friendlyName) ?? // friendly
      list.find((p) => this.unfriendlyName(p.name) === unfriendlyName) ?? // unfriendly
      list.find((p) => p.type === 'link' && resolve(p.root) === resolve(name)) ?? // link
      false
    )
  }

  public async install(name: string, {force = false, tag = 'latest'} = {}): Promise<Interfaces.Config> {
    await this.maybeCleanUp()
    try {
      this.debug(`installing plugin ${name}`)
      const options = {cwd: this.config.dataDir, logLevel: this.logLevel, prod: true}
      await this.ensurePJSON()
      let plugin: Config
      const args = force ? ['--force'] : []
      if (name.includes(':')) {
        // url
        const url = name
        const output = await this.npm.install([...args, url], options)
        const {dependencies} = await this.pjson()
        const {default: npa} = await import('npm-package-arg')
        const normalizedUrl = npa(url)
        const matches = Object.entries(dependencies ?? {}).find(([, u]) => {
          const normalized = npa(u)
          return (
            normalized.hosted?.type === normalizedUrl.hosted?.type &&
            normalized.hosted?.user === normalizedUrl.hosted?.user &&
            normalized.hosted?.project === normalizedUrl.hosted?.project
          )
        })
        const installedPluginName = matches?.[0]
        if (!installedPluginName) throw new Errors.CLIError(`Could not find plugin name for ${url}`)
        const root = join(this.config.dataDir, 'node_modules', installedPluginName)
        plugin = await Config.load({
          devPlugins: false,
          name: installedPluginName,
          root,
          userPlugins: false,
        })

        notifyUser(plugin, output)

        this.isValidPlugin(plugin)

        await this.add({name: installedPluginName, type: 'user', url})

        // Check that the prepare script produced all the expected files
        // If it didn't, it might be because the plugin doesn't have a prepare
        // script that compiles the plugin from source.
        const safeToNotExist = new Set(['npm-shrinkwrap.json', 'oclif.lock', 'oclif.manifest.json'])
        const files = ((plugin.pjson.files ?? []) as string[])
          .map((f) => join(root, f))
          .filter((f) => !safeToNotExist.has(basename(f)))

        this.debug(`checking for existence of files: ${files.join(', ')}`)
        const results = Object.fromEntries(await Promise.all(files?.map(async (f) => [f, await fileExists(f)]) ?? []))
        this.debug(results)
        if (!Object.values(results).every(Boolean)) {
          ux.warn(
            `This plugin from github may not work as expected because the prepare script did not produce all the expected files.`,
          )
        }
      } else {
        // npm
        const range = validRange(tag)
        const unfriendly = this.unfriendlyName(name)
        if (unfriendly && (await this.npmHasPackage(unfriendly))) {
          name = unfriendly
        }

        // validate that the package name exists in the npm registry before installing
        await this.npmHasPackage(name, true)

        const output = await this.npm.install([...args, `${name}@${tag}`], options)

        this.debug(`loading plugin ${name}...`)
        plugin = await Config.load({
          devPlugins: false,
          name,
          root: join(this.config.dataDir, 'node_modules', name),
          userPlugins: false,
        })
        this.debug(`finished loading plugin ${name} at root ${plugin.root}`)
        notifyUser(plugin, output)
        this.isValidPlugin(plugin)

        await this.add({name, tag: range ?? tag, type: 'user'})
      }

      await rm(join(this.config.dataDir, 'yarn.lock'), {force: true})

      return plugin
    } catch (error: unknown) {
      this.debug('error installing plugin:', error)
      await this.uninstall(name).catch((error) => this.debug(error))

      if (String(error).includes('EACCES')) {
        throw new Errors.CLIError(error as Error, {
          suggestions: [
            `Plugin failed to install because of a permissions error.\nDoes your current user own the directory ${this.config.dataDir}?`,
          ],
        })
      }

      throw error
    }
  }

  public async link(p: string, {install}: {install: boolean}): Promise<Interfaces.Config> {
    const c = await Config.load(resolve(p))

    this.isValidPlugin(c)

    if (install) {
      if (await fileExists(join(c.root, 'yarn.lock'))) {
        this.debug('installing dependencies with yarn')
        const yarn = new Yarn({config: this.config, logLevel: this.logLevel})
        await yarn.install([], {
          cwd: c.root,
          logLevel: this.logLevel,
        })
      } else if (await fileExists(join(c.root, 'package-lock.json'))) {
        this.debug('installing dependencies with npm')
        await this.npm.install([], {
          cwd: c.root,
          logLevel: this.logLevel,
          prod: false,
        })
      } else if (await fileExists(join(c.root, 'pnpm-lock.yaml'))) {
        ux.warn(
          `pnpm is not supported for installing after a link. The link succeeded, but you may need to run 'pnpm install' in ${c.root}.`,
        )
      } else {
        ux.warn(
          `No lockfile found in ${c.root}. The link succeeded, but you may need to install the dependencies in your project.`,
        )
      }
    }

    await this.add({name: c.name, root: c.root, type: 'link'})

    return c
  }

  public async list(): Promise<Plugin[]> {
    const pjson = await this.pjson()
    return pjson.oclif.plugins
  }

  public async maybeUnfriendlyName(name: string): Promise<string> {
    await this.ensurePJSON()
    const unfriendly = this.unfriendlyName(name)
    this.debug(`checking registry for expanded package name ${unfriendly}`)
    if (unfriendly && (await this.npmHasPackage(unfriendly))) {
      return unfriendly
    }

    this.debug(`expanded package name ${unfriendly} not found, using given package name ${name}`)
    return name
  }

  public async pjson(): Promise<NormalizedUserPJSON> {
    const pjson = await this.readPJSON()
    const plugins = pjson ? normalizePlugins(pjson.oclif.plugins) : []
    return {
      ...initPJSON,
      ...pjson,
      oclif: {
        ...initPJSON.oclif,
        ...pjson?.oclif,
        plugins,
      },
    }
  }

  public async remove(name: string): Promise<void> {
    const pjson = await this.pjson()
    if (pjson.dependencies) delete pjson.dependencies[name]
    await this.savePJSON({
      ...pjson,
      oclif: {
        ...pjson.oclif,
        plugins: pjson.oclif.plugins.filter((p) => p.name !== name),
      },
    })
  }

  public unfriendlyName(name: string): string | undefined {
    if (name.includes('@')) return
    const {pluginPrefix, scope} = this.config.pjson.oclif
    if (!scope) return
    return `@${scope}/${pluginPrefix ?? 'plugin'}-${name}`
  }

  public async uninstall(name: string): Promise<void> {
    try {
      const pjson = await this.pjson()
      if ((pjson.oclif.plugins ?? []).some((p) => typeof p === 'object' && p.type === 'user' && p.name === name)) {
        await this.npm.uninstall([name], {
          cwd: this.config.dataDir,
          logLevel: this.logLevel,
        })
      }
    } catch (error: unknown) {
      ux.warn(error as Error)
    } finally {
      await this.remove(name)
    }
  }

  public async update(): Promise<void> {
    let plugins = (await this.list()).filter((p): p is Interfaces.UserPlugin => p.type === 'user')
    if (plugins.length === 0) return

    await this.maybeCleanUp()

    // migrate deprecated plugins
    const aliases = this.config.pjson.oclif.aliases || {}
    for (const [name, to] of Object.entries(aliases)) {
      const plugin = plugins.find((p) => p.name === name)
      if (!plugin) continue
      // eslint-disable-next-line no-await-in-loop
      if (to) await this.install(to)
      // eslint-disable-next-line no-await-in-loop
      await this.uninstall(name)
      plugins = plugins.filter((p) => p.name !== name)
    }

    const urlPlugins = plugins.filter((p) => Boolean(p.url))
    if (urlPlugins.length > 0) {
      await this.npm.update(
        urlPlugins.map((p) => p.name),
        {
          cwd: this.config.dataDir,
          logLevel: this.logLevel,
        },
      )
    }

    const npmPlugins = plugins.filter((p) => !p.url)
    const jitPlugins = this.config.pjson.oclif.jitPlugins ?? {}
    const modifiedPlugins: Plugin[] = []
    if (npmPlugins.length > 0) {
      await this.npm.install(
        npmPlugins.map((p) => {
          // a not valid tag indicates that it's a dist-tag like 'latest'
          if (!valid(p.tag)) return `${p.name}@${p.tag}`

          if (p.tag && valid(p.tag) && jitPlugins[p.name] && gt(p.tag, jitPlugins[p.name])) {
            // The user has installed a version of the JIT plugin that is newer than the one
            // specified by the root plugin's JIT configuration. In this case, we want to
            // keep the version installed by the user.
            return `${p.name}@${p.tag}`
          }

          const tag = jitPlugins[p.name] ?? p.tag
          modifiedPlugins.push({...p, tag})
          return `${p.name}@${tag}`
        }),
        {cwd: this.config.dataDir, logLevel: this.logLevel, prod: true},
      )
    }

    await this.add(...modifiedPlugins)
  }

  private async ensurePJSON() {
    if (!(await fileExists(this.pjsonPath))) {
      this.debug(`creating ${this.pjsonPath} with pjson: ${JSON.stringify(initPJSON, null, 2)}`)
      await this.savePJSON(initPJSON)
    }
  }

  private isValidPlugin(p: Config): boolean {
    if (p.valid) return true

    if (
      this.config.plugins.get('@oclif/plugin-legacy') ||
      // @ts-expect-error because _base is private
      p._base.includes('@oclif/plugin-legacy')
    ) {
      return true
    }

    throw new Errors.CLIError('plugin is invalid', {
      suggestions: [
        'Plugin failed to install because it does not appear to be a valid CLI plugin.\nIf you are sure it is, contact the CLI developer noting this error.',
      ],
    })
  }

  private async maybeCleanUp(): Promise<void> {
    // If the yarn.lock exists, then we assume that the last install was done with an older major
    // version of plugin-plugins that used yarn (v1). In this case, we want to remove the yarn.lock
    // and node_modules to ensure a clean install or update.
    if (await fileExists(join(this.config.dataDir, 'yarn.lock'))) {
      try {
        this.debug('Found yarn.lock! Removing yarn.lock and node_modules...')
        await Promise.all([
          rename(join(this.config.dataDir, 'node_modules'), join(this.config.dataDir, 'node_modules.old')),
          rm(join(this.config.dataDir, 'yarn.lock'), {force: true}),
        ])

        // Spawn a new process so that node_modules can be deleted asynchronously.
        const rmScript = join(dirname(fileURLToPath(import.meta.url)), 'rm.js')
        this.debug(`spawning ${rmScript} to remove node_modules.old`)
        spawn(process.argv[0], [rmScript, join(this.config.dataDir, 'node_modules.old')], {
          detached: true,
          stdio: 'ignore',
          ...(this.config.windows ? {shell: true} : {}),
        }).unref()
      } catch (error) {
        this.debug('Error cleaning up yarn.lock and node_modules:', error)
      }
    }
  }

  private async npmHasPackage(name: string, throwOnNotFound = false): Promise<boolean> {
    try {
      await this.npm.view([name], {
        cwd: this.config.dataDir,
        logLevel: this.logLevel,
      })
      this.debug(`Found ${name} in the registry.`)
      return true
    } catch (error) {
      this.debug(error)
      if (throwOnNotFound) throw new Errors.CLIError(`${name} does not exist in the registry.`)
      return false
    }
  }

  private async readPJSON(): Promise<undefined | UserPJSON> {
    try {
      return JSON.parse(await readFile(this.pjsonPath, 'utf8')) as UserPJSON
    } catch (error: unknown) {
      this.debug(error)
      const err = error as Error & {code?: string}
      if (err.code !== 'ENOENT') process.emitWarning(err)
    }
  }

  private async savePJSON(pjson: UserPJSON) {
    await mkdir(dirname(this.pjsonPath), {recursive: true})
    await writeFile(this.pjsonPath, JSON.stringify({name: this.config.name, ...pjson}, null, 2))
  }
}

// if the plugin is a simple string, convert it to an object
const normalizePlugins = (input: Plugin[]): Plugin[] => {
  const normalized = (input ?? []).map((p) =>
    typeof p === 'string'
      ? {
          name: p,
          tag: 'latest',
          type: 'user' as const,
        }
      : p,
  )

  return dedupePlugins(normalized)
}
