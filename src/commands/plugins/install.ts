import {Command, flags} from '@oclif/command'
import chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../plugins'

export default class PluginsInstall extends Command {
  static description = 'installs a plugin into the CLI'
  static usage = 'plugins:install PLUGIN...'
  static examples = ['$ <%= config.bin %> plugins:install <%- config.pjson.oclif.examplePlugin || "myplugin" %> ']
  static strict = false
  static args = [{name: 'plugin', description: 'plugin to install', required: true}]
  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  }
  static aliases = ['plugins:add']

  plugins = new Plugins(this.config)

  async run() {
    const {flags, argv} = this.parse(PluginsInstall)
    if (flags.verbose) this.plugins.verbose = true
    for (let plugin of argv) {
      let {name, tag} = parsePlugin(plugin)
      cli.action.start(`Installing plugin ${chalk.cyan(this.plugins.friendlyName(name))}`)
      await this.plugins.install(name, tag)
      cli.action.stop()
    }
  }
}

function parsePlugin(input: string): {name: string, tag: string} {
  if (input.includes('/')) {
    input = input.slice(1)
    let [name, tag = 'latest'] = input.split('@')
    return {name: '@' + name, tag}
  } else {
    let [name, tag = 'latest'] = input.split('@')
    return {name, tag}
  }
}
