import {Command, flags} from '@oclif/command'
import * as chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../modules/plugins'

export default class PluginsLink extends Command {
  static description = `links a plugin into the CLI for development
Installation of a linked plugin will override a user-installed or core plugin.

e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' command will override the user-installed or core plugin implementation. This is useful for development work.
`

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
