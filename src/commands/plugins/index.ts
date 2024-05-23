import {Command, Flags, Interfaces, Plugin} from '@oclif/core'
import {dim} from 'ansis'
// @ts-expect-error because object-treeify does not have types: https://github.com/blackflux/object-treeify/issues/1077
import treeify from 'object-treeify'

import Plugins from '../../plugins.js'
import {sortBy} from '../../util.js'

type JitPlugin = {name: string; type: string; version: string}
type PluginsJson = Array<Interfaces.Plugin | JitPlugin>
interface RecursiveTree {
  [key: string]: RecursiveTree | string
}

export default class PluginsIndex extends Command {
  static description = 'List installed plugins.'
  static enableJsonFlag = true

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    core: Flags.boolean({description: 'Show core plugins.'}),
  }

  plugins!: Plugins

  async run(): Promise<PluginsJson> {
    const {flags} = await this.parse(PluginsIndex)
    this.plugins = new Plugins({
      config: this.config,
    })

    let plugins = this.config.getPluginsList()
    sortBy(plugins, (p) => this.plugins.friendlyName(p.name))
    if (!flags.core) {
      plugins = plugins.filter((p) => p.type !== 'core' && p.type !== 'dev')
    }

    if (plugins.length === 0) this.log('No plugins installed.')

    const results = this.config.getPluginsList()
    const userAndLinkedPlugins = new Set(
      results.filter((p) => p.type === 'user' || p.type === 'link').map((p) => p.name),
    )
    const jitPluginsConfig = this.config.pjson.oclif.jitPlugins ?? {}

    const jitPlugins: JitPlugin[] = Object.entries(jitPluginsConfig)
      .map(([name, version]) => ({name, type: 'jit', version}))
      .filter((p) => !userAndLinkedPlugins.has(p.name))

    sortBy(jitPlugins, (p) => p.name)

    if (!this.jsonEnabled()) {
      this.display(plugins as Plugin[])
      this.displayJitPlugins(jitPlugins)
    }

    return [...results.filter((p) => !p.parent), ...jitPlugins]
  }

  private createTree(plugin: Plugin) {
    const tree: RecursiveTree = {}
    for (const p of plugin.children) {
      tree[this.formatPlugin(p)] = this.createTree(p)
    }

    return tree
  }

  private display(plugins: Plugin[]) {
    for (const plugin of plugins.filter((p: Plugin) => !p.parent)) {
      this.log(this.formatPlugin(plugin))
      if (plugin.children && plugin.children.length > 0) {
        const tree = this.createTree(plugin)
        this.log(treeify(tree))
      }
    }
  }

  private displayJitPlugins(jitPlugins: JitPlugin[]) {
    if (jitPlugins.length === 0) return
    this.log(dim('\nUninstalled JIT Plugins:'))
    for (const {name, version} of jitPlugins) {
      this.log(`${this.plugins.friendlyName(name)} ${dim(version)}`)
    }
  }

  private formatPlugin(plugin: Plugin): string {
    let output = `${this.plugins.friendlyName(plugin.name)} ${dim(plugin.version)}`
    if (plugin.type !== 'user') output += dim(` (${plugin.type})`)
    if (plugin.type === 'link') output += ` ${plugin.root}`
    else if (plugin.tag && plugin.tag !== 'latest') output += dim(` (${String(plugin.tag)})`)
    return output
  }
}
