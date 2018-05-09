import {Command} from '@oclif/command'
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
  static args = [{name: 'plugin', description: 'plugin to uninstall', required: true}]
  static aliases = ['plugins:unlink', 'plugins:remove']

  plugins = new Plugins(this.config)

  async run() {
    const {argv} = this.parse(PluginsUninstall)
    this.plugins = new Plugins(this.config)
    for (let plugin of argv) {
      const friendly = this.plugins.friendlyName(plugin)
      cli.action.start(`Uninstalling ${friendly}`)
      const unfriendly = await this.plugins.hasPlugin(plugin)
      if (!unfriendly) {
        return this.error(`${friendly} is not installed`)
      }
      await this.plugins.uninstall(unfriendly.name)
      cli.action.stop()
    }
  }
}
