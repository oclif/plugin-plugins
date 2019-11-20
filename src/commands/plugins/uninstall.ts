import {Command, flags} from '@oclif/command'
import {Plugin} from '@oclif/config'
import cli from 'cli-ux'

import Plugins from '../../plugins'

export default class PluginsUninstall extends Command {
  static description = 'removes a plugin from the CLI'

  static usage = 'plugins:uninstall PLUGIN...'

  static help = `
  Example:
    $ <%- config.bin %> plugins:uninstall <%- config.pjson.oclif.examplePlugin || "myplugin" %>
  `

  static variableArgs = true

  static args = [{name: 'plugin', description: 'plugin to uninstall'}]

  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  }

  static aliases = ['plugins:unlink', 'plugins:remove']

  plugins = new Plugins(this.config)

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ugnored
  /* eslint-disable no-await-in-loop */
  async run() {
    const {flags, argv} = this.parse(PluginsUninstall)
    this.plugins = new Plugins(this.config)
    if (flags.verbose) this.plugins.verbose = true
    if (argv.length === 0) argv.push('.')
    for (const plugin of argv) {
      const friendly = this.plugins.friendlyName(plugin)
      cli.action.start(`Uninstalling ${friendly}`)
      const unfriendly = await this.plugins.hasPlugin(plugin)
      if (!unfriendly) {
        const p = this.config.plugins.find(p => p.name === plugin) as Plugin | undefined
        if (p) {
          if (p && p.parent) return this.error(`${friendly} is installed via plugin ${p.parent!.name}, uninstall ${p.parent!.name} instead`)
        }
        return this.error(`${friendly} is not installed`)
      }
      await this.plugins.uninstall(unfriendly.name)
      cli.action.stop()
    }
  }
  /* eslint-enable no-await-in-loop */
}
