import {Command, Flags} from '@oclif/core'

import Plugins from '../../plugins.js'

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
    await this.plugins.update()
  }
}
