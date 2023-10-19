import {Command, Flags, ux} from '@oclif/core'

import Plugins from '../../plugins.js'
import {WarningsCache} from '../../util.js'

export default class PluginsUpdate extends Command {
  static description = 'Update installed plugins.'

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  }

  plugins = new Plugins(this.config)

  async run(): Promise<void> {
    const {flags} = await this.parse(PluginsUpdate)
    this.plugins.verbose = flags.verbose
    ux.action.start(`${this.config.name}: Updating plugins`)

    await this.plugins.update()

    ux.action.stop()

    WarningsCache.getInstance().flush()
  }
}
