import {Command} from '@oclif/command'

import Plugins from '../../plugins'

export default class PluginsUpdate extends Command {
  static topic = 'plugins'
  static command = 'update'
  static description = 'update installed plugins'

  plugins = new Plugins(this.config)

  async run() {
    this.parse(PluginsUpdate)
    await this.plugins.update()
  }
}
