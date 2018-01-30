import {IConfig, read} from '@dxcli/config'
import {expect, FancyTypes, NockScope, test as base} from '@dxcli/test'
import * as fs from 'fs-extra'

export const test = base
.finally(async () => {
  const config = await read({root: __dirname})
  await Promise.all([
    fs.remove(config.cacheDir),
    fs.remove(config.configDir),
    fs.remove(config.dataDir),
  ])
})

export {
  expect,
  IConfig,
  FancyTypes,
  NockScope,
}
