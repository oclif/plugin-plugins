import {IConfig} from '@oclif/config'
import * as path from 'path'

const debug = require('debug')('cli:yarn')

export default class Yarn {
  config: IConfig
  cwd: string

  constructor({config, cwd}: { config: IConfig; cwd: string }) {
    this.config = config
    this.cwd = cwd
  }

  get bin(): string {
    return require.resolve('yarn/bin/yarn.js')
  }

  fork(modulePath: string, args: string[] = [], options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const {fork} = require('child_process')
      let forked = fork(modulePath, args, options)
      forked.stdout.on('data', (d: any) => process.stdout.write(d))
      forked.stderr.on('data', (d: any) => process.stderr.write(d))

      forked.on('error', reject)
      forked.on('exit', (code: number) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`yarn ${args.join(' ')} exited with code ${code}`))
        }
      })

      // Fix windows bug with node-gyp hanging for input forever
      // if (this.config.windows) {
      //   forked.stdin.write('\n')
      // }
    })
  }

  async exec(args: string[] = []): Promise<void> {
    if (args[0] !== 'run') {
      const cacheDir = path.join(this.config.cacheDir, 'yarn')
      args = [
        ...args,
        '--non-interactive',
        `--mutex=file:${path.join(this.cwd, 'yarn.lock')}`,
        `--preferred-cache-folder=${cacheDir}`,
        '--check-files',
        // '--no-lockfile',
        ...this.proxyArgs(),
      ]
      if (this.config.npmRegistry) {
        args.push(`--registry=${this.config.npmRegistry}`)
      }
    }

    const npmRunPath = require('npm-run-path')
    let options = {
      cwd: this.cwd,
      stdio: [0, null, null, 'ipc'],
      env: npmRunPath.env({cwd: this.cwd, env: process.env}),
    }

    debug(`${this.cwd}: ${this.bin} ${args.join(' ')}`)
    try {
      await this.fork(this.bin, args, options)
      debug('done')
    } catch (err) {
      // TODO: https://github.com/yarnpkg/yarn/issues/2191
      let networkConcurrency = '--network-concurrency=1'
      if (err.message.includes('EAI_AGAIN') && !args.includes(networkConcurrency)) {
        debug('EAI_AGAIN')
        return this.exec([...args, networkConcurrency])
      }
      throw err
    }
  }

  proxyArgs(): string[] {
    let args = []
    let http = process.env.http_proxy || process.env.HTTP_PROXY
    let https = process.env.https_proxy || process.env.HTTPS_PROXY
    if (http) args.push(`--proxy=${http}`)
    if (https) args.push(`--https-proxy=${https}`)
    return args
  }
}
