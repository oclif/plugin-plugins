import {IConfig, read} from '@anycli/config'
import {cli} from 'cli-ux'
import * as fs from 'fs-extra'
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
      cli.info(`Installing plugin ${name}${tag === 'latest' ? '' : '@' + tag}`)
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

  public async uninstall(name: string) {
    const plugins = await this.manifest.list()
    if (!plugins[name]) return
    await this.manifest.remove(name)
    await this.yarn.exec(['remove', name])
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
      await fs.outputJSON(this.pjsonPath, {private: true, 'cli-engine': {schema: 1}}, {spaces: 2})
    }
  }

  private get userPluginsDir() {
    return path.join(this.config.dataDir, 'plugins')
  }
  private get pjsonPath() {
    return path.join(this.userPluginsDir, 'package.json')
  }
}
