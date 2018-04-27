import color from '@heroku-cli/color'
import {Command, flags} from '@oclif/command'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

export default class PluginsIndex extends Command {
  static flags = {
    core: flags.boolean({description: 'show core plugins'})
  }
  static description = 'list installed plugins'
  static examples = ['$ <%- config.bin %> plugins']

  // static examples = [`<%
// let examplePlugins = {
  // 'heroku-ci': {version: '1.8.0'},
  // 'heroku-cli-status': {version: '3.0.10', type: 'link'},
  // 'heroku-fork': {version: '4.1.22'}
// }
// const examplePluginsHelp = Object.entries(examplePlugins).map(([name, p]) => \`    \${name} \${p.version}\`).join('\n')
// %>$ <%- config.bin %> plugins
// <%- examplePluginsHelp %>
// `]

  plugins = new Plugins(this.config)

  async run() {
    const {flags} = this.parse(PluginsIndex)
    let plugins = this.config.plugins
    sortBy(plugins, p => this.plugins.friendlyName(p.name))
    if (!flags.core) {
      plugins = plugins.filter(p => p.type !== 'core' && p.type !== 'dev')
    }
    if (!plugins.length) {
      this.log('no plugins installed')
      return
    }
    for (let plugin of plugins) {
      let output = `${this.plugins.friendlyName(plugin.name)} ${color.dim(plugin.version)}`
      if (plugin.type !== 'user') output += color.dim(` (${plugin.type})`)
      if (plugin.type === 'link') output += ` ${plugin.root}`
      else if (plugin.tag && plugin.tag !== 'latest') output += color.dim(` (${String(plugin.tag)})`)
      this.log(output)
    }
  }
}
