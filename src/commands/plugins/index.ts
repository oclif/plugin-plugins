import color from '@oclif/color'
import {Command, Flags, Plugin, ux} from '@oclif/core'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

export default class PluginsIndex extends Command {
  static enableJsonFlag = true
  static flags = {
    core: Flags.boolean({description: 'Show core plugins.'}),
  }

  static description = 'List installed plugins.'

  static examples = ['$ <%- config.bin %> plugins']

  plugins = new Plugins(this.config)

  async run(): Promise<ReturnType<Plugins['list']>> {
    const {flags} = await this.parse(PluginsIndex)
    let plugins = this.config.plugins
    sortBy(plugins, p => this.plugins.friendlyName(p.name))
    if (!flags.core) {
      plugins = plugins.filter(p => p.type !== 'core' && p.type !== 'dev')
    }

    if (plugins.length === 0) {
      this.log('No plugins installed.')
      return []
    }

    if (!this.jsonEnabled()) {
      this.display(plugins as Plugin[])
    }

    return this.plugins.list()
  }

  private display(plugins: Plugin[]) {
    for (const plugin of plugins.filter((p: Plugin) => !p.parent)) {
      this.log(this.formatPlugin(plugin))
      if (plugin.children && plugin.children.length > 0) {
        const tree = this.createTree(plugin)
        tree.display()
      }
    }
  }

  private createTree(plugin: Plugin) {
    const tree = ux.tree()
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
