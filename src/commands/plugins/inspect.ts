import * as path from 'path'
import {Command, Flags, Plugin} from '@oclif/core'
import * as chalk from 'chalk'
import * as fs from 'fs-extra'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

const TAB = '  '

function trimUntil(fsPath: string, part: string): string {
  const parts = fsPath.split(path.sep)
  const indicies = parts.reduce((a, e, i) => (e === part) ? a.concat([i]) : a, [] as number[])
  const partIndex = Math.max(...indicies)
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

  static args = [
    {name: 'plugin', description: 'Plugin to inspect.', required: true, default: '.'},
  ];

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  };

  plugins = new Plugins(this.config);

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ugnored
  /* eslint-disable no-await-in-loop */
  async run() {
    const {flags, argv} = await this.parse(PluginsInspect)
    if (flags.verbose) this.plugins.verbose = true
    const aliases = this.config.pjson.oclif.aliases || {}
    for (let name of argv) {
      if (name === '.') {
        const pkgJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))
        name = pkgJson.name
      }
      if (aliases[name] === null) this.error(`${name} is blocked`)
      name = aliases[name] || name
      const pluginName = await this.parsePluginName(name)

      try {
        await this.inspect(pluginName, flags.verbose)
      } catch (error) {
        this.log(chalk.bold.red('failed'))
        throw error
      }
    }
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
    const pluginConfig = this.config.plugins.find(plg => plg.name === pluginName)

    if (pluginConfig) return pluginConfig as Plugin
    throw new Error(`${pluginName} not installed`)
  }

  async inspect(pluginName: string, verbose = false) {
    const plugin = this.findPlugin(pluginName)
    this.log(chalk.bold.cyan(plugin.name))

    this.log(`${TAB}version: ${plugin.version}`)
    if (plugin.tag) this.log(`${TAB}tag: ${plugin.tag}`)
    if (plugin.pjson.homepage) this.log(`${TAB}homepage: ${plugin.pjson.homepage}`)
    this.log(`${TAB}location: ${plugin.root}`)

    this.log(`${TAB}commands:`)
    const commands = sortBy(plugin.commandIDs, c => c)
    commands.forEach(cmd => this.log(`${TAB.repeat(2)}${cmd}`))

    const dependencies = Object.assign({}, plugin.pjson.dependencies)

    this.log(`${TAB}dependencies:`)
    const deps = sortBy(Object.keys(dependencies), d => d)
    for (const dep of deps) {
      // eslint-disable-next-line no-await-in-loop
      const {version, pkgPath} = await this.findDep(plugin, dep)
      if (!version) continue

      const from = dependencies[dep] ?? null
      const msg = from ? `${TAB.repeat(2)}${dep}: ${from} => ${version}` : `${TAB.repeat(2)}${dep}: ${version}`

      if (verbose) this.log(`${msg} (${pkgPath})`)
      else this.log(msg)
    }
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
