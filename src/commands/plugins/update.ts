import {Command, flags} from '@oclif/command'

import Plugins from '../../modules/plugins'

export default class PluginsUpdate extends Command {
  static topic = 'plugins'

  static command = 'update'

  static description = 'update installed plugins'

  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  }

  plugins = new Plugins(this.config)

  async run() {
    const {flags} = this.parse(PluginsUpdate)
    this.plugins.verbose = flags.verbose
    await this.plugins.update()
  }
}
