import color from '@oclif/color'
import {Command, flags} from '@oclif/command'
import {Plugin} from '@oclif/config'
import {cli} from 'cli-ux'

import Plugins from '../../modules/plugins'
import {sortBy} from '../../modules/util'

export default class PluginsIndex extends Command {
  static flags = {
    core: flags.boolean({description: 'show core plugins'}),
  }

  static description = 'list installed plugins'

  static examples = ['$ <%- config.bin %> plugins list']

  plugins = new Plugins(this.config)

  async run() {
    const {flags} = this.parse(PluginsIndex)
    let plugins = this.config.plugins
    sortBy(plugins, p => this.plugins.friendlyName(p.name))
    if (!flags.core) {
      plugins = plugins.filter(p => p.type !== 'core' && p.type !== 'dev')
    }
    if (plugins.length === 0) {
      this.log('no plugins installed')
      return
    }
    this.display(plugins as Plugin[])
  }

  private display(plugins: Plugin[]) {
    for (const plugin of plugins.filter((p: Plugin) => !p.parent)) {
      this.log(this.formatPlugin(plugin))
      if (plugin.children && plugin.children.length > 0) {
        const tree = this.createTree(plugin)
        tree.display(this.log)
      }
    }
  }

  private createTree(plugin: Plugin) {
    const tree = cli.tree()
    for (const p of plugin.children) {
      const name = this.formatPlugin(p)
      tree.insert(name, this.createTree(p))
    }
    return tree
  }

  private formatPlugin(plugin: any): string {
    let output = `${this.plugins.friendlyName(plugin.name)} ${color.dim(plugin.version)}`
    if (plugin.type !== 'user')
      output += color.dim(` (${plugin.type})`)
    if (plugin.type === 'link')
      output += ` ${plugin.root}`
    else if (plugin.tag && plugin.tag !== 'latest')
      output += color.dim(` (${String(plugin.tag)})`)
    return output
  }
}
