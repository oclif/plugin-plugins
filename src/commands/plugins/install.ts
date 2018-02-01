import {Command, parse} from '@anycli/command'
import cli from 'cli-ux'
import HTTP from 'http-call'

import Plugins from '../../plugins'

let examplePlugin = 'heroku-production-status'
let bin = 'heroku'
const g = global as any
if (g.anycli && g.anycli.config) {
  const config = g.anycli.config
  bin = config.bin
  let pjson = config.pjson.anycli || config.pjson['cli-engine']
  if (pjson.help && pjson.help.plugins) {
    examplePlugin = Object.keys(pjson.help.plugins)[0]
  }
}

export default class PluginsInstall extends Command {
  static description = 'installs a plugin into the CLI'
  static usage = 'plugins:install PLUGIN...'
  static help = `
  Example:
    $ ${bin} plugins:install ${examplePlugin}
  `
  static strict = false
  static args = [{name: 'plugin', description: 'plugin to install', required: true}]

  plugins = new Plugins(this.config)
  options = parse(this.argv, PluginsInstall)

  async run() {
    for (let plugin of this.options.argv) {
      let {name, tag, scope} = parsePlugin(plugin)
      plugin = scope ? `@${scope}/${name}@${tag}` : `${name}@${tag}`
      cli.action.start(`Installing plugin ${plugin}`)
      const defaultScope = this.config.pjson.anycli.pluginScope
      if (!scope && defaultScope) {
        let version = await this.fetchVersionFromNPM({name, tag, scope: defaultScope})
        if (version) scope = defaultScope
      }
      await this.plugins.install(scope ? `@${scope}/${name}` : name, tag)
      cli.action.stop()
    }
  }

  private async fetchVersionFromNPM(plugin: {name: string, scope?: string, tag: string}): Promise<string | undefined> {
    try {
      let url = plugin.scope ? `${this.config.npmRegistry}/-/package/@${plugin.scope}%2f${plugin.name}/dist-tags` : `${this.config.npmRegistry}/-/package/${plugin.name}/dist-tags`
      const {body: pkg} = await HTTP.get(url)
      return pkg[plugin.tag]
    } catch (err) {
      this.debug(err)
    }
  }
}

function parsePlugin(input: string): {name: string, scope?: string, tag: string} {
  if (input.includes('/')) {
    let [scope, nameAndTag] = input.split('/')
    scope = scope.slice(1)
    let [name, tag = 'latest'] = nameAndTag.split('@')
    return {scope, name, tag}
  } else {
    let [name, tag = 'latest'] = input.split('@')
    return {name, tag}
  }
}
