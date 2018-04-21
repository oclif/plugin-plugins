import {Command} from '@oclif/command'
import chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../plugins'

export default class PluginsLink extends Command {
  static description = 'links a plugin into the CLI for development'
  static usage = 'plugins:install PLUGIN...'
  static examples = ['$ <%= config.bin %> plugins:install <%- config.pjson.oclif.examplePlugin || "heroku-production-status" %> ']
  static args = [{name: 'path', description: 'path to plugin', required: true, default: '.'}]

  plugins = new Plugins(this.config)

  async run() {
    const {args} = this.parse(PluginsLink)
    cli.action.start(`Linking plugin ${chalk.cyan(args.path)}`)
    await this.plugins.link(args.path)
    cli.action.stop()
  }
}
