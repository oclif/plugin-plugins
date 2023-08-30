import {Config} from '@oclif/core'
import * as Fancy from '@oclif/test'
import {rm} from 'fs/promises'

export const test = Fancy.test
.finally(async () => {
  const config = await Config.load()
  await Promise.all([
    // fs.remove(config.cacheDir),
    rm(config.configDir, {recursive: true, force: true}),
    rm(config.dataDir, {recursive: true, force: true}),
  ])
})

export {expect} from 'fancy-test'
export {Fancy}
