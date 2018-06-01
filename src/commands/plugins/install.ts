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
      let p = parsePlugin(plugin)
      if (p.type === 'npm') {
        cli.action.start(`Installing plugin ${chalk.cyan(this.plugins.friendlyName(p.name))}`)
        await this.plugins.install(p.name, p.tag)
      } else {
        cli.action.start(`Installing plugin ${chalk.cyan(p.url)}`)
        await this.plugins.install(p.url)
      }
      cli.action.stop()
    }
  }
}

function parsePlugin(input: string): {name: string, tag: string, type: 'npm'} | {url: string, type: 'repo'} {
  if (input.includes('@') && input.includes('/')) {
    input = input.slice(1)
    let [name, tag = 'latest'] = input.split('@')
    return {name: '@' + name, tag, type: 'npm'}
  } else if (input.includes('/')) {
    if (input.includes(':')) return {url: input, type: 'repo'}
    else return {url: `https://github.com/${input}`, type: 'repo'}
  } else {
    let [name, tag = 'latest'] = input.split('@')
    return {name, tag, type: 'npm'}
  }
}
