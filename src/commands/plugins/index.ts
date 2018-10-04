import color from '@oclif/color'
import {Command, flags} from '@oclif/command'
import {IPlugin} from '@oclif/config'

import Plugins from '../../plugins'
import {sortBy} from '../../util'

const treeify = require('treeify')

class Tree {
  nodes: {[key: string]: Tree} = {}
  constructor() {}

  insert(child: string, parent?: string): boolean {
    // if not parent, at root tree
    if (!parent) {
      this.nodes[child] = new Tree()
      return true
    }
    // if already inserted return
    if (this.search(child)) return true
    // find parent
    let node = this.search(parent)
    // and insert
    if (node) {
      node.insert(child)
      return true
    }
    return false
  }

  search(key: string): Tree | undefined {
    for (let child of Object.keys(this.nodes)) {
      if (child === key) return this.nodes[child]
      else return this.nodes[child].search(key)
    }
  }

  // tslint:disable-next-line:no-console
  display(logger: any = console.log) {
    const addNodes = function (nodes: any) {
      let tree: { [key: string]: any } = {}
      for (let p of Object.keys(nodes)) {
        tree[p] = addNodes(nodes[p].nodes)
      }
      return tree
    }

    let tree = addNodes(this.nodes)
    logger(treeify.asTree(tree, true, true, true))
  }
}

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

  private addToTree(tree: Tree, plugin: IPlugin, parent?: string) {
    const name = this.formatPlugin(plugin)
    tree.insert(name, parent)
    for (let p of plugin.children) {
      this.addToTree(tree, p, name)
    }
  }

  private display(plugins: IPlugin[]) {
    let tree = new Tree()

    for (let plugin of plugins.filter(p => !p.parent)) {
      this.addToTree(tree, plugin)
    }

    tree.display(this.log)
  }

  private formatPlugin(plugin: any): string {
    // console.log(plugin.type)
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
