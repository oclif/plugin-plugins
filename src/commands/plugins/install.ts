import {Command} from '@anycli/command'
import chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../plugins'

// let examplePlugin = 'heroku-production-status'
// let bin = 'heroku'
// const g = global as any
// if (g.anycli && g.anycli.config) {
//   const config = g.anycli.config
//   bin = config.bin
//   let pjson = config.pjson.anycli || config.pjson['cli-engine']
//   if (pjson.help && pjson.help.plugins) {
//     examplePlugin = Object.keys(pjson.help.plugins)[0]
//   }
// }

export default class PluginsInstall extends Command {
  static description = 'installs a plugin into the CLI'
  static usage = 'plugins:install PLUGIN...'
  static examples = [`
Example:
  $ <%= config.bin %> plugins:install \${examplePlugin}
`]
  static strict = false
  static args = [{name: 'plugin', description: 'plugin to install', required: true}]

  plugins = new Plugins(this.config)

  async run() {
    const {argv} = this.parse(PluginsInstall)
    for (let plugin of argv) {
      let {name, tag} = parsePlugin(plugin)
      cli.action.start(`Installing plugin ${chalk.cyan(this.plugins.friendlyName(name))}`)
      await this.plugins.install(name, tag)
      cli.action.stop()
    }
  }
}

function parsePlugin(input: string): {name: string, tag: string} {
  if (input.includes('/')) {
    input = input.slice(1)
    let [name, tag = 'latest'] = input.split('@')
    return {name: '@' + name, tag}
  } else {
    let [name, tag = 'latest'] = input.split('@')
    return {name, tag}
  }
}
