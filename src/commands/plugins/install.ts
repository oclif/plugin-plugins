import {Command, flags} from '@oclif/command'
import chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../plugins'

export default class PluginsInstall extends Command {
  static description = `installs a plugin into the CLI
Can be installed from npm or a git url.

Installation of a user-installed plugin will override a core plugin.

e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in the CLI without the need to patch and update the whole CLI.
`
  static usage = 'plugins:install PLUGIN...'
  static examples = [
    '$ <%= config.bin %> plugins:install <%- config.pjson.oclif.examplePlugin || "myplugin" %> ',
    '$ <%= config.bin %> plugins:install https://github.com/someuser/someplugin',
    '$ <%= config.bin %> plugins:install someuser/someplugin',
  ]
  static strict = false
  static args = [{name: 'plugin', description: 'plugin to install', required: true}]
  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
    force: flags.boolean({char: 'f', description: 'yarn install with force flag'}),
  }
  static aliases = ['plugins:add']

  plugins = new Plugins(this.config)

  async run() {
    const {flags, argv} = this.parse(PluginsInstall)
    if (flags.verbose) this.plugins.verbose = true
    const aliases = this.config.pjson.oclif.aliases || {}
    for (let name of argv) {
      if (aliases[name] === null) this.error(`${name} is blacklisted`)
      name = aliases[name] || name
      let p = await this.parsePlugin(name)
      let plugin
      await this.config.runHook('plugins:preinstall', {
        plugin: p
      })
      if (p.type === 'npm') {
        cli.action.start(`Installing plugin ${chalk.cyan(this.plugins.friendlyName(p.name))}`)
        plugin = await this.plugins.install(p.name, {tag: p.tag, force: flags.force})
      } else {
        cli.action.start(`Installing plugin ${chalk.cyan(p.url)}`)
        plugin = await this.plugins.install(p.url, {force: flags.force})
      }
      cli.action.stop(`installed v${plugin.version}`)
    }
  }

  async parsePlugin(input: string): Promise<{name: string, tag: string, type: 'npm'} | {url: string, type: 'repo'}> {
    if (input.includes('@') && input.includes('/')) {
      input = input.slice(1)
      let [name, tag = 'latest'] = input.split('@')
      return {name: '@' + name, tag, type: 'npm'}
    } else if (input.includes('/')) {
      if (input.includes(':')) return {url: input, type: 'repo'}
      else return {url: `https://github.com/${input}`, type: 'repo'}
    } else {
      let [name, tag = 'latest'] = input.split('@')
      name = await this.plugins.maybeUnfriendlyName(name)
      return {name, tag, type: 'npm'}
    }
  }
}
