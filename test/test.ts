import {Config} from '@oclif/core'
import * as Fancy from '@oclif/test'
import {rm} from 'node:fs/promises'

export const test = Fancy.test
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .finally(async () => {
    const config = await Config.load()
    await Promise.all([
      // fs.remove(config.cacheDir),
      rm(config.configDir, {force: true, recursive: true}),
      rm(config.dataDir, {force: true, recursive: true}),
    ])
  })

export * as Fancy from '@oclif/test'

export {expect} from 'fancy-test'
