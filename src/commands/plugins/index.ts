import Command, {flags} from '@anycli/command'
import color from '@heroku-cli/color'
import cli from 'cli-ux'
import * as _ from 'lodash'

import Plugins from '../../plugins'

let examplePlugins = {
  'heroku-ci': {version: '1.8.0'},
  'heroku-cli-status': {version: '3.0.10', type: 'link'},
  'heroku-fork': {version: '4.1.22'},
}
let bin = 'heroku'
const g = global as any
if (g.anycli && g.anycli.config) {
  const config = g.anycli.config
  bin = config
  let pjson = config.pjson.anycli || config.pjson['cli-engine']
  if (pjson.help && pjson.help.plugins) {
    examplePlugins = pjson.help.plugins
  }
}
const examplePluginsHelp = Object.entries(examplePlugins).map(([name, p]: [string, any]) => `    ${name} ${p.version}`)

export default class PluginsIndex extends Command {
  static flags: flags.Input<PluginsIndex['flags']> = {
    core: flags.boolean({description: 'show core plugins'})
  }
  static description = 'list installed plugins'
  static help = `Example:
    $ ${bin} plugins
${examplePluginsHelp.join('\n')}
`
  plugins: Plugins
  flags: {
    core: boolean
  }

  async run() {
    this.plugins = new Plugins(this.config)
    let plugins = this.config.engine!.plugins
    _.sortBy(plugins, 'name')
    if (!this.flags.core) plugins = plugins.filter(p => p.type !== 'core')
    if (!plugins.length) {
      cli.info('no plugins installed')
    }
    for (let plugin of plugins) {
      let output = `${plugin.name} ${color.dim(plugin.version)}`
      if (plugin.type !== 'user') output += color.dim(` (${plugin.type})`)
      if (plugin.type === 'link') output += ` ${plugin.root}`
      else if (plugin.tag && plugin.tag !== 'latest') output += color.dim(` (${String(plugin.tag)})`)
      cli.log(output)
    }
  }
}
