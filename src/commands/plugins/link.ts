import {Command, flags} from '@oclif/command'
import chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../plugins'

export default class PluginsLink extends Command {
  static description = 'links a plugin into the CLI for development'
  static usage = 'plugins:link PLUGIN'
  static examples = ['$ <%= config.bin %> plugins:link <%- config.pjson.oclif.examplePlugin || "myplugin" %> ']
  static args = [{name: 'path', description: 'path to plugin', required: true, default: '.'}]
  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  }

  plugins = new Plugins(this.config)

  async run() {
    const {flags, args} = this.parse(PluginsLink)
    this.plugins.verbose = flags.verbose
    cli.action.start(`Linking plugin ${chalk.cyan(args.path)}`)
    await this.plugins.link(args.path)
    cli.action.stop()
  }
}
