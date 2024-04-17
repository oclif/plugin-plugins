import {Interfaces, ux} from '@oclif/core'
import makeDebug from 'debug'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'

import {ExecOptions, Output, fork} from './fork.js'
import {LogLevel} from './log-level.js'

const require = createRequire(import.meta.url)
const debug = makeDebug('@oclif/plugin-plugins:yarn')

export class Yarn {
  private config: Interfaces.Config
  private logLevel: LogLevel

  public constructor({config, logLevel}: {config: Interfaces.Config; logLevel: LogLevel}) {
    this.config = config
    this.logLevel = logLevel
  }

  async exec(args: string[] = [], options: ExecOptions): Promise<Output> {
    const bin = await this.findYarn()
    debug('yarn binary path', bin)

    if (options.logLevel === 'verbose') args.push('--verbose')
    if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)

    if (options.logLevel !== 'notice' && options.logLevel !== 'silent') {
      ux.logToStderr(`${options.cwd}: ${bin} ${args.join(' ')}`)
    }

    debug(`${options.cwd}: ${bin} ${args.join(' ')}`)
    try {
      const output = await fork(bin, args, options)
      debug('yarn done')
      return output
    } catch (error: unknown) {
      debug('yarn error', error)
      throw error
    }
  }

  async install(args: string[], opts: ExecOptions): Promise<Output> {
    return this.exec(['install', ...args], opts)
  }

  private async findYarn(): Promise<string> {
    return require.resolve('yarn/bin/yarn.js', {paths: [this.config.root, fileURLToPath(import.meta.url)]})
  }
}
