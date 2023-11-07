import {Command} from '@oclif/core'
import chalk from 'chalk'

import Plugins from '../../plugins.js'

export default class Reset extends Command {
  static summary = 'Remove all user-installed and linked plugins.'

  async run(): Promise<void> {
    const plugins = new Plugins(this.config)
    const userPlugins = await plugins.list()

    this.log(`Uninstalling ${userPlugins.length} plugin${userPlugins.length === 0 ? '' : 's'}`)
    for (const plugin of userPlugins) {
      this.log(`• ${plugin.name} ${chalk.dim(`(${plugin.type})`)}`)
    }

    await Promise.all(userPlugins.map(async (plugin) => plugins.uninstall(plugin.name)))
  }
}
