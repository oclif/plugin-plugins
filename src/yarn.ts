import {Interfaces, ux} from '@oclif/core'
import makeDebug from 'debug'
import {fork} from 'node:child_process'
import {createRequire} from 'node:module'
import * as path from 'node:path'
import NpmRunPath from 'npm-run-path'

const debug = makeDebug('cli:yarn')

const require = createRequire(import.meta.url)

export default class Yarn {
  config: Interfaces.Config

  constructor({config}: {config: Interfaces.Config}) {
    this.config = config
  }

  get bin(): string {
    return require.resolve('yarn/bin/yarn.js')
  }

  async exec(args: string[] = [], opts: {cwd: string; silent: boolean; verbose: boolean}): Promise<void> {
    const {cwd, silent, verbose} = opts
    if (args[0] !== 'run') {
      // https://classic.yarnpkg.com/lang/en/docs/cli/#toc-concurrency-and-mutex
      // Default port is: 31997
      const port = this.config.scopedEnvVar('NETWORK_MUTEX_PORT')
      const optionalPort = port ? `:${port}` : ''
      const mutex = this.config.scopedEnvVar('USE_NETWORK_MUTEX')
        ? `network${optionalPort}`
        : `file:${path.join(cwd, 'yarn.lock')}`
      const cacheDir = path.join(this.config.cacheDir, 'yarn')
      args = [...args, '--non-interactive', `--mutex=${mutex}`, `--preferred-cache-folder=${cacheDir}`, '--check-files']

      const networkTimeout = this.config.scopedEnvVar('NETWORK_TIMEOUT')
      if (networkTimeout) args.push(`--network-timeout=${networkTimeout}`)

      if (verbose && !silent) args.push('--verbose')
      if (silent && !verbose) args.push('--silent')

      if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)
    }

    const npmRunPath: typeof NpmRunPath = require('npm-run-path')
    const options = {
      ...opts,
      cwd,
      env: npmRunPath.env({cwd, env: process.env}),
      // The ts-node/esm loader isn't need to execute yarn commands anyways.
      execArgv: process.execArgv
        .join(' ')
        .replace('--loader ts-node/esm', '')
        .replace('--loader=ts-node/esm', '')
        .split(' ')
        .filter(Boolean),
      // Remove --loader ts-node/esm from execArgv so that the subprocess doesn't fail if it can't find ts-node.
      stdio: [0, null, null, 'ipc'],
    }

    if (verbose) {
      process.stderr.write(`${cwd}: ${this.bin} ${args.join(' ')}`)
    }

    debug(`${cwd}: ${this.bin} ${args.join(' ')}`)
    try {
      await this.fork(this.bin, args, options)
      debug('yarn done')
    } catch (error: unknown) {
      const {message} = error as Error & {message: string}
      debug('yarn error', error)
      // to-do: https://github.com/yarnpkg/yarn/issues/2191
      const networkConcurrency = '--network-concurrency=1'
      if (message.includes('EAI_AGAIN') && !args.includes(networkConcurrency)) {
        debug('EAI_AGAIN')
        return this.exec([...args, networkConcurrency], opts)
      }

      throw error
    }
  }

  fork(modulePath: string, args: string[] = [], options: Record<string, unknown> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const forked = fork(modulePath, args, options)
      forked.stderr?.on('data', (d) => {
        if (!options.silent) process.stderr.write(d)
      })
      forked.stdout?.setEncoding('utf8')
      forked.stdout?.on('data', (d) => {
        if (options.verbose) process.stdout.write(d)
        else ux.action.status = d.replace(/\n$/, '').split('\n').pop()
      })

      forked.on('error', reject)
      forked.on('exit', (code: number) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`${modulePath} ${args.join(' ')} exited with code ${code}`))
        }
      })
    })
  }
}
