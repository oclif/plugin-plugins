import {IConfig, IPlugin} from '@dxcli/config'

import Plugins from './plugins'

export default async function (config: IConfig, cb: any) {
  const plugins = new Plugins(config)
  await Promise.all((await plugins.list()).map((([n]) => cb({name: n, root: plugins.userPluginPath(n), type: 'user'}))))
}

export {IPlugin}
