import {Command, Flags, Interfaces, Plugin, ux} from '@oclif/core'
import chalk from 'chalk'

import Plugins from '../../plugins.js'
import {sortBy} from '../../util.js'

type JitPlugin = {name: string; type: string; version: string}
type PluginsJson = Array<Interfaces.Plugin | JitPlugin>

export default class PluginsIndex extends Command {
  static description = 'List installed plugins.'
  static enableJsonFlag = true

  static examples = ['$ <%- config.bin %> plugins']

  static flags = {
    core: Flags.boolean({description: 'Show core plugins.'}),
  }

  plugins = new Plugins(this.config)

  async run(): Promise<PluginsJson> {
    const {flags} = await this.parse(PluginsIndex)
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

    return [...results, ...jitPlugins]
  }

  private createTree(plugin: Plugin) {
    const tree = ux.tree()
    for (const p of plugin.children) {
      const name = this.formatPlugin(p)
      tree.insert(name, this.createTree(p))
    }

    return tree
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

  private displayJitPlugins(jitPlugins: JitPlugin[]) {
    if (jitPlugins.length === 0) return
    this.log(chalk.dim('\nUninstalled JIT Plugins:'))
    for (const {name, version} of jitPlugins) {
      this.log(`${this.plugins.friendlyName(name)} ${chalk.dim(version)}`)
    }
  }

  private formatPlugin(plugin: Plugin): string {
    let output = `${this.plugins.friendlyName(plugin.name)} ${chalk.dim(plugin.version)}`
    if (plugin.type !== 'user') output += chalk.dim(` (${plugin.type})`)
    if (plugin.type === 'link') output += ` ${plugin.root}`
    else if (plugin.tag && plugin.tag !== 'latest') output += chalk.dim(` (${String(plugin.tag)})`)
    return output
  }
}
