import {IConfig, IPlugin} from '@dxcli/config'
import {load} from '@dxcli/loader'
import {cli} from 'cli-ux'
import * as fs from 'fs-extra'
import * as _ from 'lodash'
import * as path from 'path'

import Manifest from './manifest'
import Yarn from './yarn'

export default class Plugins {
  private manifest: Manifest
  private yarn: Yarn
  private debug: any

  constructor(public config: IConfig) {
    this.manifest = new Manifest(path.join(this.config.dataDir, 'plugins', 'user.json'))
    this.yarn = new Yarn({config, cwd: this.userPluginsDir})
    this.debug = require('debug')('@dxcli/plugins')
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
      let plugin = await this.loadPlugin(name)
      if (!plugin.commands.length) throw new Error('no commands found in plugin')
      await this.manifest.add(name, tag)
    } catch (err) {
      await this.uninstall(name).catch(err => this.debug(err))
      throw err
    }
  }

  async load(): Promise<IPlugin[]> {
    const plugins = await this.list()
    return _.compact(await Promise.all(plugins.map(async ([p]) => {
      try {
        return await this.loadPlugin(p)
      } catch (err) {
        cli.warn(err)
      }
    })))
  }

  public async uninstall(name: string) {
    const plugins = await this.manifest.list()
    if (!plugins[name]) return
    await this.manifest.remove(name)
    await this.yarn.exec(['remove', name])
  }

  private async loadPlugin(name: string) {
    return load({root: this.userPluginPath(name), type: 'user', resetCache: true})
  }

  private async createPJSON() {
    if (!await fs.pathExists(this.pjsonPath)) {
      await fs.outputJSON(this.pjsonPath, {private: true, 'cli-engine': {schema: 1}}, {spaces: 2})
    }
  }

  private userPluginPath(name: string): string {
    return path.join(this.userPluginsDir, 'node_modules', name)
  }
  private get userPluginsDir() {
    return path.join(this.config.dataDir, 'plugins')
  }
  private get pjsonPath() {
    return path.join(this.userPluginsDir, 'package.json')
  }
}
