import {Hook} from '@oclif/core'

import Plugins from '../plugins.js'

export const update: Hook<'update'> = async function () {
  const plugins = new Plugins({
    config: this.config,
  })
  try {
    await plugins.update()
  } catch (error: unknown) {
    if (error instanceof Error) {
      this.error(error.message)
    }
  }
}
