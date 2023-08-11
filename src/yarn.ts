import {Interfaces, ux} from '@oclif/core'
import {fork, spawn} from 'child_process'
import NpmRunPath from 'npm-run-path'
import * as path from 'path'

const debug = require('debug')('cli:yarn')

export default class Yarn {
  config: Interfaces.Config

  constructor({config}: { config: Interfaces.Config }) {
    this.config = config
  }

  get bin(): string {
    return require.resolve('yarn/bin/yarn.js')
  }

  fork(modulePath: string, args: string[] = [], options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const forked = fork(modulePath, args, options)
      forked.stderr?.on('data', (d: any) => process.stderr.write(d))
      forked.stdout?.setEncoding('utf8')
      forked.stdout?.on('data', (d: any) => {
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

      // Fix windows bug with node-gyp hanging for input forever
      // if (this.config.windows) {
      //   forked.stdin.write('\n')
      // }
    })
  }

  spawn(executable: string, args: string[] = [], options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const spawned = spawn(executable, args, {...options, shell: true})
      spawned.stderr.setEncoding('utf8')
      spawned.stderr.on('data', (d: any) => {
        debug('spawned yarn stderr:', d)
        process.stderr.write(d)
      })
      spawned.stdout.setEncoding('utf8')
      spawned.stdout.on('data', (d: any) => {
        debug('spawned yarn stdout:', d)
        if (options.verbose) process.stdout.write(d)
        else ux.action.status = d.replace(/\n$/, '').split('\n').pop()
      })

      spawned.on('error', reject)
      spawned.on('exit', (code: number) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`${executable} ${args.join(' ')} exited with code ${code}`))
        }
      })

      // Fix windows bug with node-gyp hanging for input forever
      // if (this.config.windows) {
      //   forked.stdin.write('\n')
      // }
    })
  }

  // eslint-disable-next-line default-param-last
  async exec(args: string[] = [], opts: {cwd: string; verbose: boolean}): Promise<void> {
    const cwd = opts.cwd
    if (args[0] !== 'run') {
      const cacheDir = path.join(this.config.cacheDir, 'yarn')
      args = [
        ...args,
        '--non-interactive',
        `--mutex=file:${path.join(cwd, 'yarn.lock')}`,
        `--preferred-cache-folder=${cacheDir}`,
        '--check-files',
      ]
      if (opts.verbose) {
        args.push('--verbose')
      }

      if (this.config.npmRegistry) {
        args.push(`--registry=${this.config.npmRegistry}`)
      }
    }

    const npmRunPath: typeof NpmRunPath = require('npm-run-path')
    const options = {
      ...opts,
      cwd,
      stdio: [0, null, null, 'ipc'],
      env: npmRunPath.env({cwd, env: process.env}),
    }

    if (opts.verbose) {
      process.stderr.write(`${cwd}: ${this.bin} ${args.join(' ')}`)
    }

    debug(`${cwd}: ${this.bin} ${args.join(' ')}`)
    try {
      // TODO: always use spawn instead of fork once this has been thoroughly tested
      this.config.scopedEnvVarTrue('PLUGINS_INSTALL_USE_SPAWN') ?
        await this.spawn(this.bin, args, options) :
        await this.fork(this.bin, args, options)

      debug('yarn done')
    } catch (error: any) {
      debug('yarn error', error)
      // to-do: https://github.com/yarnpkg/yarn/issues/2191
      const networkConcurrency = '--network-concurrency=1'
      if (error.message.includes('EAI_AGAIN') && !args.includes(networkConcurrency)) {
        debug('EAI_AGAIN')
        return this.exec([...args, networkConcurrency], opts)
      }

      throw error
    }
  }
}
