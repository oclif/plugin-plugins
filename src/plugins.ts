import {Config, Errors, Interfaces, ux} from '@oclif/core'
import makeDebug from 'debug'
import {access, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises'
import {dirname, join, resolve} from 'node:path'
import npa from 'npm-package-arg'
import {gt, valid, validRange} from 'semver'

import {NPM, PackageManager} from './package-manager.js'
import {uniqWith} from './util.js'
import Yarn from './yarn.js'

type UserPJSON = {
  dependencies: Record<string, string>
  oclif: {
    plugins: Array<Interfaces.PJSON.PluginTypes.Link | Interfaces.PJSON.PluginTypes.User>
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

function dedupePlugins(
  plugins: Interfaces.PJSON.PluginTypes[],
): (Interfaces.PJSON.PluginTypes.Link | Interfaces.PJSON.PluginTypes.User)[] {
  return uniqWith(
    plugins,
    // @ts-expect-error because typescript doesn't think it's possible for a plugin to have the `link` type here
    (a, b) => a.name === b.name || (a.type === 'link' && b.type === 'link' && a.root === b.root),
  ) as (Interfaces.PJSON.PluginTypes.Link | Interfaces.PJSON.PluginTypes.User)[]
}

export default class Plugins {
  public readonly packageManager: PackageManager
  public silent = false
  public verbose = false

  private readonly debug: ReturnType<typeof makeDebug>

  constructor(public config: Interfaces.Config) {
    this.debug = makeDebug('@oclif/plugins')
    this.packageManager =
      this.config.scopedEnvVar('PACKAGE_MANAGER')?.toLowerCase() === 'yarn' ? new Yarn({config}) : new NPM({config})
    if (this.packageManager.name === 'yarn') {
      ux.warn('All yarn related functionality should be removed prior to this feature being released.')
    }
  }

  public async add(...plugins: Interfaces.PJSON.PluginTypes[]): Promise<void> {
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

  public async hasPlugin(
    name: string,
  ): Promise<Interfaces.PJSON.PluginTypes.Link | Interfaces.PJSON.PluginTypes.User | false> {
    const list = await this.list()
    return (
      list.find((p) => this.friendlyName(p.name) === this.friendlyName(name)) ?? // friendly
      list.find((p) => this.unfriendlyName(p.name) === this.unfriendlyName(name)) ?? // unfriendly
      list.find((p) => p.type === 'link' && resolve(p.root) === resolve(name)) ?? // link
      false
    )
  }

  public async install(name: string, {force = false, tag = 'latest'} = {}): Promise<Interfaces.Config> {
    try {
      this.debug(`installing plugin ${name}`)
      const options = {cwd: this.config.dataDir, prod: true, silent: this.silent, verbose: this.verbose}
      await this.createPJSON()
      let plugin
      const add = force ? ['--force'] : []
      if (name.includes(':')) {
        // url
        const url = name
        await this.packageManager.install([...add, url], options)
        const {dependencies} = await this.pjson()
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
        await this.refresh({all: true, prod: true}, plugin.root)

        this.isValidPlugin(plugin)

        await this.add({name: installedPluginName, type: 'user', url})
      } else {
        // npm
        const range = validRange(tag)
        const unfriendly = this.unfriendlyName(name)
        if (unfriendly && (await this.npmHasPackage(unfriendly))) {
          name = unfriendly
        }

        // validate that the package name exists in the npm registry before installing
        await this.npmHasPackage(name, true)

        await this.packageManager.install([...add, `${name}@${tag}`], options)

        this.debug(`loading plugin ${name}...`)
        plugin = await Config.load({
          devPlugins: false,
          name,
          root: join(this.config.dataDir, 'node_modules', name),
          userPlugins: false,
        })
        this.debug(`finished loading plugin ${name} at root ${plugin.root}`)

        this.isValidPlugin(plugin)

        await this.refresh({all: true, prod: true}, plugin.root)

        await this.add({name, tag: range ?? tag, type: 'user'})
      }

      if (this.packageManager.name !== 'yarn') await rm(join(this.config.dataDir, 'yarn.lock'), {force: true})

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

  public async link(p: string, {install}: {install: boolean}): Promise<void> {
    const c = await Config.load(resolve(p))
    ux.action.start(`${this.config.name}: linking plugin ${c.name}`)
    this.isValidPlugin(c)

    // refresh will cause yarn.lock to install dependencies, including devDeps
    if (install) {
      await this.packageManager.install([], {
        cwd: c.root,
        noSpinner: true,
        prod: false,
        silent: true,
        verbose: false,
      })
    }

    await this.add({name: c.name, root: c.root, type: 'link'})
  }

  public async list(): Promise<(Interfaces.PJSON.PluginTypes.Link | Interfaces.PJSON.PluginTypes.User)[]> {
    const pjson = await this.pjson()
    return pjson.oclif.plugins
  }

  public async maybeUnfriendlyName(name: string): Promise<string> {
    const unfriendly = this.unfriendlyName(name)
    this.debug(`checking registry for expanded package name ${unfriendly}`)
    if (unfriendly && (await this.npmHasPackage(unfriendly))) {
      return unfriendly
    }

    this.debug(`expanded package name ${unfriendly} not found, using given package name ${name}`)
    return name
  }

  public async pjson(): Promise<UserPJSON> {
    const pjson = await this.readPJSON()
    const plugins = pjson ? this.normalizePlugins(pjson.oclif.plugins) : []
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

  /**
   * @deprecated
   * If a yarn.lock or oclif.lock exists at the root, refresh dependencies by
   * rerunning yarn. If options.prod is true, only install production dependencies.
   *
   * As of v9 npm will always ignore the yarn.lock during `npm pack`
   * (see https://github.com/npm/cli/issues/6738). To get around this plugins can
   * rename yarn.lock to oclif.lock before running `npm pack` using `oclif lock`.
   *
   * We still check for the existence of yarn.lock since it could be included if a plugin was
   * packed using yarn or v8 of npm. Plugins installed directly from a git url will also
   * have a yarn.lock.
   *
   * @param options {prod: boolean, all: boolean}
   * @param roots string[]
   * @returns Promise<void>
   */
  public async refresh(options: {all: boolean; prod: boolean}, ...roots: string[]): Promise<void> {
    if (this.packageManager.name !== 'yarn') return
    ux.action.status = 'Refreshing user plugins...'
    const doRefresh = async (root: string) => {
      await this.packageManager.refresh([], {
        cwd: root,
        noSpinner: true,
        prod: options.prod,
        silent: true,
        verbose: false,
      })
    }

    const pluginRoots = [...roots]
    if (options.all) {
      const userPluginsRoots = this.config
        .getPluginsList()
        .filter((p) => p.type === 'user')
        .map((p) => p.root)
      pluginRoots.push(...userPluginsRoots)
    }

    const deduped = [...new Set(pluginRoots)]
    await Promise.all(
      deduped.map(async (r) => {
        if (await fileExists(join(r, 'yarn.lock'))) {
          this.debug(`yarn.lock exists at ${r}. Installing prod dependencies`)
          await doRefresh(r)
        } else if (await fileExists(join(r, 'oclif.lock'))) {
          this.debug(`oclif.lock exists at ${r}. Installing prod dependencies`)
          await rename(join(r, 'oclif.lock'), join(r, 'yarn.lock'))
          await doRefresh(r)
        } else {
          this.debug(`no yarn.lock or oclif.lock exists at ${r}. Skipping dependency refresh`)
        }
      }),
    )
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
        await this.packageManager.uninstall([name], {
          cwd: this.config.dataDir,
          silent: this.silent,
          verbose: this.verbose,
        })
      }
    } catch (error: unknown) {
      ux.warn(error as Error)
    } finally {
      await this.remove(name)
    }
  }

  public async update(): Promise<void> {
    // eslint-disable-next-line unicorn/no-await-expression-member
    let plugins = (await this.list()).filter((p): p is Interfaces.PJSON.PluginTypes.User => p.type === 'user')
    if (plugins.length === 0) return

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

    if (plugins.some((p) => Boolean(p.url))) {
      await this.packageManager.update([], {
        cwd: this.config.dataDir,
        silent: this.silent,
        verbose: this.verbose,
      })
    }

    const npmPlugins = plugins.filter((p) => !p.url)
    const jitPlugins = this.config.pjson.oclif.jitPlugins ?? {}
    const modifiedPlugins: Interfaces.PJSON.PluginTypes[] = []
    if (npmPlugins.length > 0) {
      await this.packageManager.install(
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
        {cwd: this.config.dataDir, prod: true, silent: this.silent, verbose: this.verbose},
      )
    }

    await this.refresh({all: true, prod: true})
    await this.add(...modifiedPlugins)
  }

  private async createPJSON() {
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

  private normalizePlugins(
    input: Interfaces.PJSON.User['oclif']['plugins'],
  ): (Interfaces.PJSON.PluginTypes.Link | Interfaces.PJSON.PluginTypes.User)[] {
    const plugins = (input ?? []).map((p) => {
      if (typeof p === 'string') {
        return {
          name: p,
          tag: 'latest',
          type: 'user',
        } as Interfaces.PJSON.PluginTypes.User
      }

      return p
    })

    return dedupePlugins(plugins)
  }

  private async npmHasPackage(name: string, throwOnNotFound = false): Promise<boolean> {
    const registry = this.config.scopedEnvVar('NPM_REGISTRY')
    const args = registry ? [name, '--registry', registry] : [name]

    try {
      await this.packageManager.show(args, {
        cwd: this.config.dataDir,
        silent: true,
        verbose: false,
      })
      this.debug(`Found ${name} in the registry.`)
      return true
    } catch (error) {
      this.debug(error)
      if (throwOnNotFound) throw new Errors.CLIError(`${name} does not exist in the registry.`)
      return false
    }
  }

  private get pjsonPath() {
    return join(this.config.dataDir, 'package.json')
  }

  private async readPJSON(): Promise<Interfaces.PJSON.User | undefined> {
    try {
      return JSON.parse(await readFile(this.pjsonPath, 'utf8')) as Interfaces.PJSON.User
    } catch (error: unknown) {
      this.debug(error)
      const err = error as Error & {code?: string}
      if (err.code !== 'ENOENT') process.emitWarning(err)
    }
  }

  private async savePJSON(pjson: UserPJSON) {
    this.debug(`saving pjson at ${this.pjsonPath}`, JSON.stringify(pjson, null, 2))
    await mkdir(dirname(this.pjsonPath), {recursive: true})
    await writeFile(this.pjsonPath, JSON.stringify({name: this.config.name, ...pjson}, null, 2))
  }
}
