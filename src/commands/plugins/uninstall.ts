/* eslint-disable no-await-in-loop */
import {Args, Command, Flags, ux} from '@oclif/core'
import chalk from 'chalk'

import Plugins from '../../plugins.js'
import {YarnMessagesCache} from '../../util.js'

function removeTags(plugin: string): string {
  if (plugin.includes('@')) {
    const chunked = plugin.split('@')
    const last = chunked.at(-1)

    if (!last?.includes('/') && chunked.length > 1) {
      chunked.pop()
    }

    return chunked.join('@')
  }

  return plugin
}

export default class PluginsUninstall extends Command {
  static aliases = ['plugins:unlink', 'plugins:remove']

  static args = {
    plugin: Args.string({description: 'plugin to uninstall'}),
  }

  static description = 'Removes a plugin from the CLI.'

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  }

  static help = `
  Example:
    $ <%- config.bin %> plugins:uninstall <%- config.pjson.oclif.examplePlugin || "myplugin" %>
  `

  static static = false

  static usage = 'plugins:uninstall PLUGIN...'

  plugins = new Plugins(this.config)

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ignored
  async run(): Promise<void> {
    const {argv, flags} = await this.parse(PluginsUninstall)
    this.plugins = new Plugins(this.config)
    if (flags.verbose) this.plugins.verbose = true
    if (argv.length === 0) argv.push('.')
    for (const plugin of argv as string[]) {
      const friendly = removeTags(this.plugins.friendlyName(plugin))
      ux.action.start(`Uninstalling ${friendly}`)
      const unfriendly = await this.plugins.hasPlugin(removeTags(plugin))
      if (!unfriendly) {
        const p = this.config.getPluginsList().find((p) => p.name === plugin)
        if (p?.parent)
          return this.error(
            `${friendly} is installed via plugin ${p.parent!.name}, uninstall ${p.parent!.name} instead`,
          )

        return this.error(`${friendly} is not installed`)
      }

      try {
        const {name} = unfriendly
        await this.plugins.uninstall(name)
      } catch (error) {
        ux.action.stop(chalk.bold.red('failed'))
        throw error
      }

      ux.action.stop()

      YarnMessagesCache.getInstance().flush()
    }
  }
}
