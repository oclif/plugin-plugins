import {Args, Command, Flags, Plugin, ux} from '@oclif/core'
import chalk from 'chalk'
import {readFile} from 'node:fs/promises'
import {dirname, join, sep} from 'node:path'

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

type Dependencies = Record<string, {from: string; version: string}>
type PluginWithDeps = Omit<
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
> & {deps: Dependencies}

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

  plugins = new Plugins(this.config)

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
    const tree = ux.tree()
    const pluginHeader = chalk.bold.cyan(plugin.name)
    tree.insert(pluginHeader)
    tree.nodes[pluginHeader].insert(`version ${plugin.version}`)
    if (plugin.tag) tree.nodes[pluginHeader].insert(`tag ${plugin.tag}`)
    if (plugin.pjson.homepage) tree.nodes[pluginHeader].insert(`homepage ${plugin.pjson.homepage}`)
    tree.nodes[pluginHeader].insert(`location ${plugin.root}`)

    tree.nodes[pluginHeader].insert('commands')
    const commands = sortBy(plugin.commandIDs, (c) => c)
    for (const cmd of commands) tree.nodes[pluginHeader].nodes.commands.insert(cmd)

    const dependencies = {...plugin.pjson.dependencies}

    tree.nodes[pluginHeader].insert('dependencies')
    const deps = sortBy(Object.keys(dependencies), (d) => d)
    const depsJson: Dependencies = {}
    for (const dep of deps) {
      // eslint-disable-next-line no-await-in-loop
      const {pkgPath, version} = await this.findDep(plugin, dep)
      if (!version) continue

      const from = dependencies[dep] ?? null
      const versionMsg = chalk.dim(from ? `${from} => ${version}` : version)
      const msg = verbose ? `${dep} ${versionMsg} ${pkgPath}` : `${dep} ${versionMsg}`

      tree.nodes[pluginHeader].nodes.dependencies.insert(msg)
      depsJson[dep] = {from, version}
    }

    if (!this.jsonEnabled()) tree.display()

    return {...plugin, deps: depsJson}
  }

  /* eslint-disable no-await-in-loop */
  async run(): Promise<PluginWithDeps[]> {
    const {argv, flags} = await this.parse(PluginsInspect)
    if (flags.verbose) this.plugins.verbose = true
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
        this.log(chalk.bold.red('failed'))
        throw error
      }
    }

    return plugins
  }
}
