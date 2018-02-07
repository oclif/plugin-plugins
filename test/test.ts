import * as Config from '@anycli/config'
import * as Fancy from '@anycli/test'
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
