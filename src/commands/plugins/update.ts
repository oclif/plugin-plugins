import {Command, Flags, ux} from '@oclif/core'

import {determineLogLevel} from '../../log-level.js'
import Plugins from '../../plugins.js'

export default class PluginsUpdate extends Command {
  static description = 'Update installed plugins.'
  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(PluginsUpdate)

    const plugins = new Plugins({
      config: this.config,
      logLevel: determineLogLevel(this.config, flags, 'silent'),
    })

    ux.action.start(`${this.config.name}: Updating plugins`)

    await plugins.update()

    ux.action.stop()
  }
}
