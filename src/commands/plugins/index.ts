import {Command, flags, parse} from '@anycli/command'
import color from '@heroku-cli/color'
import cli from 'cli-ux'
import * as _ from 'lodash'

import Plugins from '../../plugins'

export default class PluginsIndex extends Command {
  static flags = {
    core: flags.boolean({description: 'show core plugins'})
  }
  static description = 'list installed plugins'
  static examples = [`<%
let examplePlugins = {
  'heroku-ci': {version: '1.8.0'},
  'heroku-cli-status': {version: '3.0.10', type: 'link'},
  'heroku-fork': {version: '4.1.22'},
}
const examplePluginsHelp = Object.entries(examplePlugins).map(([name, p]: [string, any]) => \`    \${name} \${p.version}\`)

%>Example:
    $ <%- config.bin> plugins
<%- examplePluginsHelp.join('\n') %>
`]

  plugins = new Plugins(this.config)
  options = parse(this.argv, PluginsIndex)

  async run() {
    let plugins = this.config.plugins
    _.sortBy(plugins, 'name')
    if (!this.options.flags.core) {
      plugins = plugins.filter(p => p.type !== 'core' && p.type !== 'dev')
    }
    if (!plugins.length) {
      cli.info('no plugins installed')
      return
    }
    for (let plugin of plugins) {
      let output = `${this.plugins.friendlyName(plugin.name)} ${color.dim(plugin.version)}`
      if (plugin.type !== 'user') output += color.dim(` (${plugin.type})`)
      if (plugin.type === 'link') output += ` ${plugin.root}`
      else if (plugin.tag && plugin.tag !== 'latest') output += color.dim(` (${String(plugin.tag)})`)
      cli.log(output)
    }
  }
}
