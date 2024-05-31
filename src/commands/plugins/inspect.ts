import {Args, Command, Flags, Plugin} from '@oclif/core'
import {bold, dim} from 'ansis'
import {readFile} from 'node:fs/promises'
import {dirname, join, sep} from 'node:path'
// @ts-expect-error because object-treeify does not have types: https://github.com/blackflux/object-treeify/issues/1077
import treeify from 'object-treeify'

import {determineLogLevel} from '../../log-level.js'
import Plugins from '../../plugins.js'
import {sortBy} from '../../util.js'

function trimUntil(fsPath: string, part: string): string {
  const parts = fsPath.split(sep)
  // eslint-disable-next-line unicorn/no-array-reduce
  const indices = parts.reduce<number[]>(
    (result, current, index) => (current === part ? [...result, index] : result),
    [],
  )
  const partIndex = Math.max(...indices)
  if (partIndex === -1) return fsPath
  return parts.slice(0, partIndex + 1).join(sep)
}

type Dependencies = Record<string, {from: string | undefined; version: string}>
type PluginWithDeps = {deps: Dependencies} & Omit<
  Plugin,
  | '_commandsDir'
  | '_debug'
  | '_manifest'
  | 'addErrorScope'
  | 'commandIDs'
  | 'commandsDir'
  | 'findCommand'
  | 'flexibleTaxonomy'
  | 'load'
  | 'topics'
  | 'warn'
  | 'warned'
>

export default class PluginsInspect extends Command {
  static args = {
    plugin: Args.string({
      default: '.',
      description: 'Plugin to inspect.',
      required: true,
    }),
  }

  static description = 'Displays installation properties of a plugin.'

  static enableJsonFlag = true

  static examples = ['<%= config.bin %> <%= command.id %> <%- config.pjson.oclif.examplePlugin || "myplugin" %> ']

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  }

  static strict = false

  static usage = 'plugins:inspect PLUGIN...'

  plugins!: Plugins

  async findDep(plugin: Plugin, dependency: string): Promise<{pkgPath: null | string; version: null | string}> {
    const dependencyPath = join(...dependency.split('/'))
    let start = join(plugin.root, 'node_modules')
    const paths = [start]
    while ((start.match(/node_modules/g) ?? []).length > 1) {
      start = trimUntil(dirname(start), 'node_modules')
      paths.push(start)
    }

    // NOTE: we cannot parallelize this because we need to check the paths in the order they were found.
    // Parallelizing this would be faster, but would make the result non-deterministic.
    for (const p of paths) {
      try {
        const fullPath = join(p, dependencyPath)
        const pkgJsonPath = join(fullPath, 'package.json')
        // eslint-disable-next-line no-await-in-loop
        const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'))
        return {pkgPath: fullPath, version: pkgJson.version as string}
      } catch {
        // try the next path
      }
    }

    return {pkgPath: null, version: null}
  }

  findPlugin(pluginName: string): Plugin {
    const pluginConfig = this.config.getPluginsList().find((plg) => plg.name === pluginName)

    if (pluginConfig) return pluginConfig as Plugin
    if (this.config.pjson.oclif.jitPlugins?.[pluginName]) {
      this.warn(
        `Plugin ${pluginName} is a JIT plugin. It will be installed the first time you run one of it's commands.`,
      )
    }

    throw new Error(`${pluginName} not installed`)
  }

  async inspect(pluginName: string, verbose = false): Promise<PluginWithDeps> {
    const plugin = this.findPlugin(pluginName)
    const dependencies: Record<string, null> = {}
    const depsJson: Dependencies = {}
    for (const dep of sortBy(Object.keys({...plugin.pjson.dependencies}), (d) => d)) {
      // eslint-disable-next-line no-await-in-loop
      const {pkgPath, version} = await this.findDep(plugin, dep)
      if (!version) continue

      const from = plugin.pjson.dependencies?.[dep]
      const versionMsg = dim(from ? `${from} => ${version}` : version)
      const msg = verbose ? `${dep} ${versionMsg} ${pkgPath}` : `${dep} ${versionMsg}`

      dependencies[msg] = null
      depsJson[dep] = {from, version}
    }

    const tree = {
      [bold.cyan(plugin.name)]: {
        [`version ${plugin.version}`]: null,
        ...(plugin.tag ? {[`tag ${plugin.tag}`]: null} : {}),
        ...(plugin.pjson.homepage ? {[`homepage ${plugin.pjson.homepage}`]: null} : {}),
        [`location ${plugin.root}`]: null,
        commands: Object.fromEntries(sortBy(plugin.commandIDs, (c) => c).map((id) => [id, null])),
        dependencies,
      },
    }

    this.log(treeify(tree))

    return {...plugin, deps: depsJson}
  }

  /* eslint-disable no-await-in-loop */
  async run(): Promise<PluginWithDeps[]> {
    const {argv, flags} = await this.parse(PluginsInspect)
    this.plugins = new Plugins({
      config: this.config,
      logLevel: determineLogLevel(this.config, flags, 'silent'),
    })
    const aliases = this.config.pjson.oclif.aliases ?? {}
    const plugins: PluginWithDeps[] = []
    for (let name of argv as string[]) {
      if (name === '.') {
        const pkgJson = JSON.parse(await readFile('package.json', 'utf8'))
        name = pkgJson.name
      }

      if (aliases[name] === null) this.error(`${name} is blocked`)
      name = aliases[name] ?? name
      const pluginName = (await this.plugins.maybeUnfriendlyName(name)) ?? name

      try {
        plugins.push(await this.inspect(pluginName, flags.verbose))
      } catch (error) {
        this.log(bold.red('failed'))
        throw error
      }
    }

    return plugins
  }
}
