import {Command, parse} from '@anycli/command'

import Plugins from '../../plugins'

export default class PluginsUpdate extends Command {
  static topic = 'plugins'
  static command = 'update'
  static description = 'update installed plugins'

  options = parse(this.argv, PluginsUpdate)
  plugins = new Plugins(this.config)

  async run() {
    await this.plugins.update()
  }
}
