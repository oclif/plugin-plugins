import {expect, test as base} from '@dxcli/dev-test'
import {load} from '@dxcli/loader'
import * as fs from 'fs-extra'

export const test = base
.finally(async () => {
  const plugin = await load({root: __dirname, type: 'core'})
  await Promise.all([
    fs.remove(plugin.config.cacheDir),
    fs.remove(plugin.config.configDir),
    fs.remove(plugin.config.dataDir),
  ])
})

export {expect}
