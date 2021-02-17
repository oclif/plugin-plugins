import * as path from 'path'
import {Command, flags} from '@oclif/command'
import {Plugin} from '@oclif/config'
import * as chalk from 'chalk'
import {exec} from 'child_process'
import * as fs from 'fs-extra'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

const TAB = '  '

type Dependencies = {
  [key: string]: unknown;
  from?: string;
  version?: string;
  name?: string;
  dependencies: {
    [key: string]: Dependencies;
  };
}

export default class PluginsInspect extends Command {
  static description = 'inspects an installed plugin';

  static usage = 'plugins:inspect PLUGIN...';

  static examples = [
    '$ <%= config.bin %> plugins:inspect <%- config.pjson.oclif.examplePlugin || "myplugin" %> ',
  ];

  static strict = false;

  static args = [
    {name: 'plugin', description: 'plugin to inspect', required: true, default: '.'},
  ];

  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  };

  plugins = new Plugins(this.config);

  allDeps: Dependencies = {dependencies: {}};

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ugnored
  /* eslint-disable no-await-in-loop */
  async run() {
    this.allDeps = await this.npmList(this.config.root, 3)
    const {flags, argv} = this.parse(PluginsInspect)
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
        await this.inspect(pluginName)
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

  async inspect(pluginName: string) {
    const plugin = this.findPlugin(pluginName)
    this.log(chalk.bold.cyan(plugin.name))

    this.log(`${TAB}version: ${plugin.version}`)
    if (plugin.tag) this.log(`${TAB}tag: ${plugin.tag}`)
    if (plugin.pjson.homepage) this.log(`${TAB}homepage: ${plugin.pjson.homepage}`)
    this.log(`${TAB}location: ${plugin.root}`)

    this.log(`${TAB}commands:`)
    const commands = sortBy(plugin.commandIDs, c => c)
    commands.forEach(cmd => this.log(`${TAB.repeat(2)}${cmd}`))

    const dependencies = plugin.root.includes(this.config.root) ?
      this.findDepInTree(plugin).dependencies :
      (await this.npmList(plugin.root)).dependencies

    this.log(`${TAB}dependencies:`)
    const deps = sortBy(Object.keys(dependencies), d => d)
    for (const dep of deps) {
      // eslint-disable-next-line no-await-in-loop
      const version = dependencies[dep].version || await this.findDepInSharedModules(plugin, dep)
      const from = dependencies[dep].from ?
        dependencies[dep].from!.split('@').reverse()[0] :
        null

      if (from) this.log(`${TAB.repeat(2)}${dep}: ${from} => ${version}`)
      else this.log(`${TAB.repeat(2)}${dep}: ${version}`)
    }
  }

  async findDepInSharedModules(plugin: Plugin, dependency: string): Promise<string> {
    const sharedModulePath = path.join(plugin.root.replace(plugin.name, ''), ...dependency.split('/'), 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(sharedModulePath, 'utf-8'))
    return pkgJson.version as string
  }

  findDepInTree(plugin: Plugin): Dependencies {
    if (plugin.name === this.allDeps.name) return this.allDeps
    const plugins = [plugin.name]
    let p = plugin
    while (p.parent) {
      plugins.push(p.parent.name)
      p = p.parent
    }

    let dependencies = this.allDeps
    for (const plg of plugins.reverse()) {
      dependencies = dependencies.dependencies[plg]
    }
    return dependencies
  }

  async npmList(cwd: string, depth = 0): Promise<Dependencies> {
    return new Promise((resolve, reject) => {
      exec(`npm list --json --depth ${depth}`, {
        cwd,
        encoding: 'utf-8',
        maxBuffer: 2048 * 2048,
      }, (error, stdout) => {
        if (error) {
          try {
            const parsed = JSON.parse(stdout)
            if (parsed) resolve(parsed)
          } catch {
            reject(new Error(`Could not get dependencies for ${cwd}`))
          }
        } else {
          resolve(JSON.parse(stdout))
        }
      })
    })
  }
}
