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

  plugins: Plugins

  async run() {
    this.plugins = new Plugins(this.config)
    for (let plugin of this.argv) {
      cli.action.start(`Uninstalling ${plugin}`)
      await this.plugins.uninstall(plugin)
      cli.action.stop()
    }
  }
}
