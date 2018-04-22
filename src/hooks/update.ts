import {Hook} from '@oclif/config'

import Plugins from '../plugins'

export const update: Hook<'update'> = async function () {
  const plugins = new Plugins(this.config)
  await plugins.update()
}
