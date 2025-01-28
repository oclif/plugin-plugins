import {Args, Command, Flags, ux} from '@oclif/core'
import {cyan} from 'ansis'

import {determineLogLevel} from '../../log-level.js'
import Plugins from '../../plugins.js'

export default class PluginsLink extends Command {
  static args = {
    path: Args.string({default: '.', description: 'path to plugin', name: 'path', required: true}),
  }
  static description = `Installation of a linked plugin will override a user-installed or core plugin.

e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' command will override the user-installed or core plugin implementation. This is useful for development work.
`
  static examples = ['<%= config.bin %> <%= command.id %> <%- config.pjson.oclif.examplePlugin || "myplugin" %> ']
  static flags = {
    help: Flags.help({char: 'h'}),
    install: Flags.boolean({
      allowNo: true,
      default: true,
      description: 'Install dependencies after linking the plugin.',
    }),
    verbose: Flags.boolean({char: 'v'}),
  }
  static summary = 'Links a plugin into the CLI for development.'

  async run(): Promise<void> {
    const {args, flags} = await this.parse(PluginsLink)

    const plugins = new Plugins({
      config: this.config,
      logLevel: determineLogLevel(this.config, flags, 'silent'),
    })

    ux.action.start(`${this.config.name}: Linking plugin ${cyan(args.path)}`)
    await plugins.link(args.path, {install: flags.install})
    ux.action.stop()
  }
}
