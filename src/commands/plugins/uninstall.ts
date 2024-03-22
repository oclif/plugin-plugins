/* eslint-disable no-await-in-loop */
import {Args, Command, Flags, ux} from '@oclif/core'
import chalk from 'chalk'

import {determineLogLevel} from '../../log-level.js'
import Plugins from '../../plugins.js'

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

  static examples = ['<%= config.bin %> <%= command.id %> <%- config.pjson.oclif.examplePlugin || "myplugin" %>']

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
  }

  static strict = false

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ignored
  async run(): Promise<void> {
    const {argv, flags} = await this.parse(PluginsUninstall)

    const plugins = new Plugins({
      config: this.config,
      logLevel: determineLogLevel(this.config, flags, 'silent'),
    })

    if (argv.length === 0) argv.push('.')
    for (const plugin of argv as string[]) {
      const friendly = removeTags(plugins.friendlyName(plugin))
      const unfriendly = await plugins.hasPlugin(removeTags(plugin))
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
        const displayName = friendly === '.' ? name : friendly ?? name
        ux.action.start(`${this.config.name}: Uninstalling ${displayName}`)
        await plugins.uninstall(name)
      } catch (error) {
        ux.action.stop(chalk.bold.red('failed'))
        throw error
      }

      ux.action.stop()
    }
  }
}
