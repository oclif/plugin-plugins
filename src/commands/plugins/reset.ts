/* eslint-disable no-await-in-loop */
import {Command, Flags} from '@oclif/core'
import chalk from 'chalk'
import {rm} from 'node:fs/promises'
import {join} from 'node:path'

import Plugins from '../../plugins.js'

export default class Reset extends Command {
  static flags = {
    hard: Flags.boolean({
      summary: 'Delete node_modules and package manager related files in addition to uninstalling plugins.',
    }),
    reinstall: Flags.boolean({
      summary: 'Reinstall all plugins after uninstalling.',
    }),
  }

  static summary = 'Remove all user-installed and linked plugins.'

  async run(): Promise<void> {
    const {flags} = await this.parse(Reset)
    const plugins = new Plugins(this.config)
    const userPlugins = await plugins.list()

    this.log(`Found the following ${userPlugins.length} plugin${userPlugins.length === 0 ? '' : 's'}:`)
    for (const plugin of userPlugins) {
      this.log(`- ${plugin.name} ${chalk.dim(`(${plugin.type})`)}`)
    }

    // These need to run sequentially so as to avoid write conflicts to the package.json
    for (const plugin of userPlugins) {
      try {
        await plugins.uninstall(plugin.name)
        this.log(`✅ Uninstalled ${plugin.name}`)
      } catch {
        this.warn(`Failed to uninstall ${plugin.name}`)
      }
    }

    if (flags.hard) {
      const filesToDelete = [
        join(this.config.dataDir, 'node_modules'),
        join(this.config.dataDir, 'package.json'),
        join(this.config.dataDir, 'yarn.lock'),
        join(this.config.dataDir, 'package-lock.json'),
      ]

      this.log('✅ Removed the following files:')
      for (const file of filesToDelete) {
        this.log(`- ${file}`)
      }

      await Promise.all(filesToDelete.map((file) => rm(file, {force: true, recursive: true})))
    }

    if (flags.reinstall) {
      // These need to run sequentially so as to avoid write conflicts to the package.json
      for (const plugin of userPlugins) {
        if (plugin.type === 'link') {
          try {
            await plugins.link(plugin.root, {install: false})
            this.log(`✅ Relinked ${plugin.name}`)
          } catch {
            this.warn(`Failed to relink ${plugin.name}`)
          }
        }

        if (plugin.type === 'user') {
          try {
            await plugins.install(plugin.name, {tag: plugin.tag})
            this.log(`✅ Reinstalled ${plugin.name}`)
          } catch {
            this.warn(`Failed to reinstall ${plugin.name}`)
          }
        }
      }
    }
  }
}
