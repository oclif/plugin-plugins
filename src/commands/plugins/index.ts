import color from '@oclif/color'
import {Command, flags} from '@oclif/command'
import {IPlugin} from '@oclif/config'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

const treeify = require('treeify')

export default class PluginsIndex extends Command {
  static flags = {
    core: flags.boolean({description: 'show core plugins'})
  }
  static description = 'list installed plugins'
  static examples = ['$ <%- config.bin %> plugins']

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
    this.display(plugins)
  }

  private display(plugins: IPlugin[]) {
    let trees: { [key: string]: any } = {root: []}

    for (let plugin of plugins) {
      if (!plugin.parent) {
        trees.root.push(plugin)
      } else {
        if (!trees[plugin.type]) trees[plugin.type] = []
        trees[plugin.type].push(plugin)
      }
    }

    for (let plugin of trees.root) {
      this.log(this.formatPlugin(plugin))
      if (trees[plugin.name]) {
        let tree: { [key: string]: any } = {}
        for (let p of trees[plugin.name]) {
          tree[this.formatPlugin(p)] = {}
        }
        const pathTree = treeify.asTree(tree, true)
        this.log(pathTree)
      }
    }
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
