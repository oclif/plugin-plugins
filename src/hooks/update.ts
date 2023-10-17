import {Hook} from '@oclif/core'

import Plugins from '../plugins.js'

export const update: Hook<'update'> = async function () {
  const plugins = new Plugins(this.config)
  try {
    await plugins.update()
  } catch (error: unknown) {
    const {message} = error as {message: string}
    this.error(message)
  }
}
