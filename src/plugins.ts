import {IConfig, read} from '@anycli/config'
import {cli} from 'cli-ux'
import * as fs from 'fs-extra'
import HTTP from 'http-call'
import * as path from 'path'

import Manifest from './manifest'
import Yarn from './yarn'

export default class Plugins {
  readonly yarn: Yarn
  private readonly manifest: Manifest
  private readonly debug: any

  constructor(public config: IConfig) {
    this.manifest = new Manifest(path.join(this.config.dataDir, 'plugins', 'user.json'))
    this.yarn = new Yarn({config, cwd: this.userPluginsDir})
    this.debug = require('debug')('@anycli/plugins')
  }

  async list() {
    const plugins = await this.manifest.list()
    return Object.entries(plugins)
  }

  async install(name: string, tag = 'latest') {
    try {
      const unfriendly = this.unfriendlyName(name)
      if (unfriendly) {
        let version = await this.fetchVersionFromNPM({name: unfriendly, tag})
        if (version) name = unfriendly
      }
      await this.createPJSON()
      await this.yarn.exec(['add', `${name}@${tag}`])
      await this.loadPlugin(name, tag)
      // if (!plugin.commands.length) throw new Error('no commands found in plugin')
      await this.manifest.add(name, tag)
    } catch (err) {
      await this.uninstall(name).catch(err => this.debug(err))
      throw err
    }
  }

  async uninstall(name: string) {
    let unfriendly = await this.hasPlugin(name)
    if (!unfriendly) return cli.warn(`${name} is not installed`)
    cli.action.start(`Uninstalling ${this.friendlyName(unfriendly)}`)
    await this.manifest.remove(name)
    try {
      await this.yarn.exec(['remove', name])
    } catch (err) {
      cli.warn(err)
    }
    cli.action.stop()
  }

  async hasPlugin(name: string): Promise<string | undefined> {
    const list = await this.list()
    const plugin = list.find(([n]) => this.friendlyName(n) === this.friendlyName(name))
    if (plugin) return plugin[0]
  }

  unfriendlyName(name: string): string | undefined {
    if (name.includes('@')) return
    const defaultScope = this.config.pjson.anycli.pluginScope
    if (!defaultScope) return
    return `@${defaultScope}/plugin-${name}`
  }

  friendlyName(name: string): string {
    const defaultScope = this.config.pjson.anycli.pluginScope
    if (!defaultScope) return name
    const match = name.match(`@${defaultScope}/plugin-(.+)`)
    if (!match) return name
    return match[1]
  }

  userPluginPath(name: string): string {
    return path.join(this.userPluginsDir, 'node_modules', name)
  }

  private async loadPlugin(name: string, _: string) {
    const config = await read({root: this.userPluginPath(name)})
    return this.config.engine!.load(config)
    // return this.config.engine!.load(config, {resetCache: true})
  }

  private async createPJSON() {
    if (!await fs.pathExists(this.pjsonPath)) {
      await fs.outputJSON(this.pjsonPath, {private: true, anycli: {schema: 1}}, {spaces: 2})
    }
  }

  private get userPluginsDir() {
    return path.join(this.config.dataDir, 'plugins')
  }
  private get pjsonPath() {
    return path.join(this.userPluginsDir, 'package.json')
  }

  private async fetchVersionFromNPM(plugin: {name: string, tag: string}): Promise<string | undefined> {
    try {
      let url = `${this.config.npmRegistry}/-/package/${plugin.name.replace('/', '%2f')}/dist-tags`
      const {body: pkg} = await HTTP.get(url)
      return pkg[plugin.tag]
    } catch (err) {
      this.debug(err)
    }
  }
}
