import {Command, Flags, ux} from '@oclif/core'

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
      silent: !flags.verbose,
      verbose: flags.verbose,
    })

    ux.action.start(`${this.config.name}: Updating plugins`)

    await plugins.update()

    ux.action.stop()
  }
}
