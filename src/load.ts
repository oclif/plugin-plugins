import {IConfig, IPlugin} from '@dxcli/config'

import Plugins from './plugins'

export default async function (config: IConfig) {
  try {
    const plugins = new Plugins(config)
    return await plugins.load()
  } catch (err) {
    const cli = require('cli-ux').scope('loading plugins')
    cli.warn(err)
  }
}

export {IPlugin}
