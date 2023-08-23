import * as path from 'path'
import {Args, Command, Flags, Plugin, ux} from '@oclif/core'
import * as chalk from 'chalk'
import * as fs from 'fs-extra'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

function trimUntil(fsPath: string, part: string): string {
  const parts = fsPath.split(path.sep)
  const indices = parts.reduce((a, e, i) => (e === part) ? a.concat([i]) : a, [] as number[])
  const partIndex = Math.max(...indices)
  if (partIndex === -1) return fsPath
  return parts.slice(0, partIndex + 1).join(path.sep)
}

export default class PluginsInspect extends Command {
  static description = 'Displays installation properties of a plugin.';

  static usage = 'plugins:inspect PLUGIN...';

  static examples = [
    '$ <%= config.bin %> plugins:inspect <%- config.pjson.oclif.examplePlugin || "myplugin" %> ',
  ];

  static strict = false;

  static enableJsonFlag = true;

  static args = {
    plugin: Args.string({
      description: 'Plugin to inspect.',
      required: true,
      default: '.',
    }),
  }

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  };

  plugins = new Plugins(this.config);

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ignored
  /* eslint-disable no-await-in-loop */
  async run(): Promise<Plugin[]> {
    const {flags, argv} = await this.parse(PluginsInspect)
    if (flags.verbose) this.plugins.verbose = true
    const aliases = this.config.pjson.oclif.aliases || {}
    const plugins: Plugin[] = []
    for (let name of argv as string[]) {
      if (name === '.') {
        const pkgJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))
        name = pkgJson.name
      }

      if (aliases[name] === null) this.error(`${name} is blocked`)
      name = aliases[name] || name
      const pluginName = await this.parsePluginName(name)

      try {
        plugins.push(await this.inspect(pluginName, flags.verbose))
      } catch (error) {
        this.log(chalk.bold.red('failed'))
        throw error
      }
    }

    return plugins
  }
  /* eslint-enable no-await-in-loop */

  async parsePluginName(input: string): Promise<string> {
    if (input.includes('@') && input.includes('/')) {
      input = input.slice(1)
      const [name] = input.split('@')
      return '@' + name
    }

    const [splitName] = input.split('@')
    const name = await this.plugins.maybeUnfriendlyName(splitName)
    return name
  }

  findPlugin(pluginName: string): Plugin {
    const pluginConfig = this.config.getPluginsList().find(plg => plg.name === pluginName)

    if (pluginConfig) return pluginConfig as Plugin
    throw new Error(`${pluginName} not installed`)
  }

  async inspect(pluginName: string, verbose = false): Promise<Plugin> {
    const plugin = this.findPlugin(pluginName)
    const tree = ux.tree()
    const pluginHeader = chalk.bold.cyan(plugin.name)
    tree.insert(pluginHeader)
    tree.nodes[pluginHeader].insert(`version ${plugin.version}`)
    if (plugin.tag) tree.nodes[pluginHeader].insert(`tag ${plugin.tag}`)
    if (plugin.pjson.homepage) tree.nodes[pluginHeader].insert(`homepage ${plugin.pjson.homepage}`)
    tree.nodes[pluginHeader].insert(`location ${plugin.root}`)

    tree.nodes[pluginHeader].insert('commands')
    const commands = sortBy(plugin.commandIDs, c => c)
    commands.forEach(cmd => tree.nodes[pluginHeader].nodes.commands.insert(cmd))

    const dependencies = Object.assign({}, plugin.pjson.dependencies)

    tree.nodes[pluginHeader].insert('dependencies')
    const deps = sortBy(Object.keys(dependencies), d => d)
    for (const dep of deps) {
      // eslint-disable-next-line no-await-in-loop
      const {version, pkgPath} = await this.findDep(plugin, dep)
      if (!version) continue

      const from = dependencies[dep] ?? null
      const versionMsg = chalk.dim(from ? `${from} => ${version}` : version)
      const msg = verbose ? `${dep} ${versionMsg} ${pkgPath}` : `${dep} ${versionMsg}`

      tree.nodes[pluginHeader].nodes.dependencies.insert(msg)
    }

    if (!this.jsonEnabled()) tree.display()
    return plugin
  }

  async findDep(plugin: Plugin, dependency: string): Promise<{ version: string | null; pkgPath: string | null}> {
    const dependencyPath = path.join(...dependency.split('/'))
    let start = path.join(plugin.root, 'node_modules')
    const paths = [start]
    while ((start.match(/node_modules/g) || []).length > 1) {
      start = trimUntil(path.dirname(start), 'node_modules')
      paths.push(start)
    }

    for (const p of paths) {
      const fullPath = path.join(p, dependencyPath)
      const pkgJsonPath = path.join(fullPath, 'package.json')
      try {
        // eslint-disable-next-line no-await-in-loop
        const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'))
        return {version: pkgJson.version as string, pkgPath: fullPath}
      } catch {
        // try the next path
      }
    }

    return {version: null, pkgPath: null}
  }
}
