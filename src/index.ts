export {default} from './plugins.js'
import PluginsIndex from './commands/plugins/index.js'
import PluginsInspect from './commands/plugins/inspect.js'
import PluginsInstall from './commands/plugins/install.js'
import PluginsLink from './commands/plugins/link.js'
import PluginsReset from './commands/plugins/reset.js'
import PluginsUninstall from './commands/plugins/uninstall.js'
import PluginsUpdate from './commands/plugins/update.js'
import {update} from './hooks/update.js'

export const commands = {
  plugins: PluginsIndex,
  'plugins:inspect': PluginsInspect,
  'plugins:install': PluginsInstall,
  'plugins:link': PluginsLink,
  'plugins:reset': PluginsReset,
  'plugins:uninstall': PluginsUninstall,
  'plugins:update': PluginsUpdate,
}

export const hooks = {
  update,
}
