import {Args, Command, Flags, ux} from '@oclif/core'
import * as chalk from 'chalk'

import Plugins from '../../plugins'

export default class PluginsLink extends Command {
  static description = `Links a plugin into the CLI for development.
Installation of a linked plugin will override a user-installed or core plugin.

e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' command will override the user-installed or core plugin implementation. This is useful for development work.
`

  static usage = 'plugins:link PLUGIN'

  static examples = ['$ <%= config.bin %> plugins:link <%- config.pjson.oclif.examplePlugin || "myplugin" %> ']

  static args = {
    path: Args.string({name: 'path', description: 'path to plugin', required: true, default: '.'}),
  }

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
    install: Flags.boolean({
      default: true,
      allowNo: true,
      description: 'Install dependencies after linking the plugin.',
    }),
  }

  plugins = new Plugins(this.config)

  async run(): Promise<void> {
    const {flags, args} = await this.parse(PluginsLink)
    this.plugins.verbose = flags.verbose
    ux.action.start(`Linking plugin ${chalk.cyan(args.path)}`)
    await this.plugins.link(args.path, {install: flags.install})
    ux.action.stop()
  }
}
