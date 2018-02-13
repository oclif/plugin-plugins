import * as Config from '@oclif/config'
import * as Fancy from '@oclif/test'
import * as fs from 'fs-extra'

export const test = Fancy.test
.finally(async () => {
  const config = await Config.load()
  await Promise.all([
    // fs.remove(config.cacheDir),
    fs.remove(config.configDir),
    fs.remove(config.dataDir),
  ])
})

export {expect} from 'fancy-test'
export {Fancy}
