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

export default class PluginsInstall extends Command {
  static description = 'installs a plugin into the CLI'
  static usage = 'plugins:install PLUGIN...'
  static help = `
  Example:
    $ ${bin} plugins:install ${examplePlugin}
  `
  static variableArgs = true
  static args = [{name: 'plugin', description: 'plugin to install', required: true}]

  plugins: Plugins

  async run() {
    this.plugins = new Plugins(this.config)
    for (let plugin of this.argv) {
      let scoped = plugin[0] === '@'
      if (scoped) plugin = plugin.slice(1)
      let [name, tag = 'latest'] = plugin.split('@')
      if (scoped) name = `@${name}`
      cli.action.start(`Installing plugin ${plugin}@${tag}`)
      await this.plugins.install(name, tag)
      cli.action.stop()
    }
  }
}
