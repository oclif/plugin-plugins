import * as Config from '@oclif/config'
import {CLIError} from '@oclif/errors'
import cli from 'cli-ux'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import HTTP from 'http-call'
import loadJSON = require('load-json-file')
import * as path from 'path'
import * as semver from 'semver'

import {uniq, uniqWith} from './util'
import Yarn from './yarn'

const initPJSON: Config.PJSON.User = {private: true, oclif: {schema: 1, plugins: []}, dependencies: {}}

export default class Plugins {
  readonly yarn: Yarn
  private readonly debug: any

  constructor(public config: Config.IConfig) {
    this.yarn = new Yarn({config, cwd: this.config.dataDir})
    this.debug = require('debug')('@oclif/plugins')
  }

  async pjson(): Promise<Config.PJSON.User> {
    try {
      const pjson: Config.PJSON = await loadJSON(this.pjsonPath)
      return {
        ...initPJSON,
        oclif: {
          ...initPJSON.oclif,
          ...pjson.oclif,
        },
        dependencies: {},
        ...pjson,
      }
    } catch (err) {
      this.debug(err)
      if (err.code !== 'ENOENT') process.emitWarning(err)
      return initPJSON
    }
  }

  async list() {
    const pjson = await this.pjson()
    return this.normalizePlugins(pjson.oclif.plugins)
  }

  async install(name: string, tag = 'latest') {
    try {
      const range = semver.validRange(tag)
      const unfriendly = this.unfriendlyName(name)
      if (unfriendly && await this.npmHasPackage(unfriendly)) {
        name = unfriendly
      }
      await this.createPJSON()
      await this.yarn.exec(['add', `${name}@${tag}`])
      // const plugin = await this.loadPlugin(name, range || tag)
      // if (!plugin.valid) {
      //   throw new Error('no commands found in plugin')
      // }
      await this.add({name, tag: range || tag, type: 'user'})
    } catch (err) {
      await this.uninstall(name).catch(err => this.debug(err))
      throw err
    }
  }

  async link(p: string) {
    const c = await Config.load(path.resolve(p))
    if (!c.valid && !this.config.plugins.find(p => p.name === '@oclif/plugin-legacy')) {
      throw new CLIError('plugin is not a valid oclif plugin')
    }
    this.add({type: 'link', name: c.name, root: c.root})
  }

  async add(plugin: Config.PJSON.PluginTypes) {
    const pjson = await this.pjson()
    pjson.oclif.plugins = uniq([...pjson.oclif.plugins || [], plugin]) as any
    await this.savePJSON(pjson)
  }

  async remove(name: string) {
    const pjson = await this.pjson()
    if (pjson.dependencies) delete pjson.dependencies[name]
    pjson.oclif.plugins = this.normalizePlugins(pjson.oclif.plugins)
    .filter(p => p.name !== name)
    await this.savePJSON(pjson)
  }

  async uninstall(name: string) {
    try {
      await this.yarn.exec(['remove', name])
    } finally {
      await this.remove(name)
    }
  }

  async update() {
    const plugins = await this.list()
    if (plugins.length === 0) return
    cli.action.start(`${this.config.name}: Updating plugins`)
    await this.yarn.exec(['add', ...plugins
      .filter((p): p is Config.PJSON.PluginTypes.User => p.type === 'user')
      .map(p => `${p.name}@${p.tag}`)
    ])
    cli.action.stop()
  }

  async hasPlugin(name: string) {
    const list = await this.list()
    return list.find(p => this.friendlyName(p.name) === this.friendlyName(name))
  }

  async yarnNodeVersion(): Promise<string | undefined> {
    try {
      let f = await loadJSON(path.join(this.config.dataDir, 'node_modules', '.yarn-integrity'))
      return f.nodeVersion
    } catch (err) {
      if (err.code !== 'ENOENT') cli.warn(err)
    }
  }

  unfriendlyName(name: string): string | undefined {
    if (name.includes('@')) return
    const scope = this.config.pjson.oclif.scope
    if (!scope) return
    return `@${scope}/plugin-${name}`
  }

  friendlyName(name: string): string {
    const scope = this.config.pjson.oclif.scope
    if (!scope) return name
    const match = name.match(`@${scope}/plugin-(.+)`)
    if (!match) return name
    return match[1]
  }

  // private async loadPlugin(plugin: Config.PJSON.PluginTypes) {
  //   return Config.load({...plugin as any, root: this.config.dataDir})
  // }

  private async createPJSON() {
    if (!fs.existsSync(this.pjsonPath)) {
      await this.savePJSON(initPJSON)
    }
  }

  private get pjsonPath() {
    return path.join(this.config.dataDir, 'package.json')
  }

  private async npmHasPackage(name: string): Promise<boolean> {
    try {
      const http: typeof HTTP = require('http-call').HTTP
      let url = `${this.config.npmRegistry}/-/package/${name.replace('/', '%2f')}/dist-tags`
      await http.get(url)
      return true
    } catch (err) {
      this.debug(err)
      return false
    }
  }

  private async savePJSON(pjson: Config.PJSON.User) {
    pjson.oclif.plugins = this.normalizePlugins(pjson.oclif.plugins)
    const fs: typeof fse = require('fs-extra')
    await fs.outputJSON(this.pjsonPath, pjson, {spaces: 2})
  }

  private normalizePlugins(input: Config.PJSON.User['oclif']['plugins']) {
    let plugins = (input || []).map(p => {
      if (typeof p === 'string') {
        return {name: p, type: 'user', tag: 'latest'} as Config.PJSON.PluginTypes.User
      } else return p
    })
    plugins = uniqWith(plugins, (a, b) => a.name === b.name || (a.type === 'link' && b.type === 'link' && a.root === b.root))
    return plugins
  }
}
