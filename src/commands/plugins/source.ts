import {Command, flags} from '@oclif/command'
import Plugins from '../../modules/plugins'
import {FeatureFlag} from 'vtex'
import {IPlugin} from '@oclif/config'
import chalk = require('chalk');

export default class PluginsSource extends Command {
  static description = 'List all plugins from VTEX'

  static usage = 'plugins:source PLUGIN'

  static examples = ['$ <%= config.bin %> plugins:source <%- config.pjson.oclif.examplePlugin || "myplugin" %> ']

  static args = [{name: 'path', description: 'path to plugin', required: true, default: '.'}]

  static flags = {
    help: flags.help({char: 'h'}),
    verbose: flags.boolean({char: 'v'}),
  }

  plugins = new Plugins(this.config)

  async run() {
    const remoteCommands: string[] = FeatureFlag.getSingleton().getFeatureFlagInfo<string[]>('REMOTE_COMMANDS').sort()
    let allPlugins: IPlugin[] = this.config.plugins
    allPlugins = allPlugins.filter(p => p.type !== 'core' && p.type !== 'dev' && p.name.startsWith('@vtex/cli-plugin-'))
    allPlugins = allPlugins.map(p => {
      p.name = p.name.replace('@vtex/cli-plugin-', '')
      return p
    })
    const plugins: string[] = allPlugins.map(p => {
      return p.name
    })
    for (let command of remoteCommands) {
      if (plugins.includes(command)) {
        command = `${chalk.green(command)}`
      }
      console.log(`• ${command}`)
    }
  }
}
