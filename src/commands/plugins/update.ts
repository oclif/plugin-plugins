import {Command, Flags} from '@oclif/core'

import Plugins from '../../plugins'

export default class PluginsUpdate extends Command {
  static topic = 'plugins'

  static command = 'update'

  static description = 'Update installed plugins.'

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  }

  plugins = new Plugins(this.config)

  async run() {
    const {flags} = await this.parse(PluginsUpdate)
    this.plugins.verbose = flags.verbose
    await this.plugins.update()
  }
}
