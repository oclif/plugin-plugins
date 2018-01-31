import {IConfig, IPlugin} from '@anycli/config'

import Plugins from './plugins'

export default async function (config: IConfig) {
  const plugins = new Plugins(config)
  const list = await plugins.list()
  return list.map(([name, {tag}]) => ({name, root: plugins.userPluginPath(name), tag, type: 'user'}))
}

export {IPlugin}
