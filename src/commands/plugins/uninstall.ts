import {Command} from '@anycli/command'
import cli from 'cli-ux'

import Plugins from '../../plugins'

let examplePlugin = 'heroku-production-status'
let bin = 'heroku'
const g = global as any
if (g.anycli && g.anycli.config) {
  const config = g.anycli.config
  bin = config.bin
  let pjson = config.pjson.anycli || config.pjson['cli-engine']
  if (pjson.help && pjson.help.plugins) {
    examplePlugin = Object.keys(pjson.help.plugins)[0]
  }
}

export default class PluginsUninstall extends Command {
  static description = 'removes a plugin from the CLI'
  static usage = 'plugins:uninstall PLUGIN...'
  static help = `
  Example:
    $ ${bin} plugins:uninstall ${examplePlugin}
  `
  static variableArgs = true
  static args = [{name: 'plugin', description: 'plugin to uninstall', required: true}]

  plugins = new Plugins(this.config)

  async run() {
    const {argv} = this.parse(PluginsUninstall)
    this.plugins = new Plugins(this.config)
    for (let plugin of argv) {
      const friendly = this.plugins.friendlyName(plugin)
      cli.action.start(`Uninstalling ${friendly}`)
      const unfriendly = await this.plugins.hasPlugin(plugin)
      if (!unfriendly) {
        cli.warn(`${friendly} is not installed`)
        continue
      }
      await this.plugins.uninstall(unfriendly.name)
      cli.action.stop()
    }
  }
}
