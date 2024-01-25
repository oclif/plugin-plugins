import {Interfaces} from '@oclif/core'
import makeDebug from 'debug'
import {fork} from 'node:child_process'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {npmRunPathEnv} from 'npm-run-path'

const debug = makeDebug('@oclif/plugin-plugins:npm')

const require = createRequire(import.meta.url)

export class NPM {
  private bin: string
  private config: Interfaces.Config
  private silent: boolean
  private verbose: boolean

  public constructor({config, silent, verbose}: {config: Interfaces.Config; silent: boolean; verbose: boolean}) {
    this.config = config
    this.silent = silent
    this.verbose = verbose
    this.bin = require.resolve('.bin/npm', {paths: [this.config.root, fileURLToPath(import.meta.url)]})
  }

  async exec(args: string[] = [], {cwd}: {cwd: string}): Promise<void> {
    debug('npm binary path', this.bin)

    if (this.verbose) args.push('--loglevel=verbose')
    if (this.silent && !this.verbose) args.push('--loglevel=silent')
    if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)

    if (this.verbose) {
      process.stderr.write(`${cwd}: ${this.bin} ${args.join(' ')}`)
    }

    debug(`${cwd}: ${this.bin} ${args.join(' ')}`)
    try {
      await this.fork(args, {cwd})
      debug('npm done')
    } catch (error: unknown) {
      debug('npm error', error)
      throw error
    }
  }

  async fork(args: string[] = [], {cwd}: {cwd: string}): Promise<void> {
    return new Promise((resolve, reject) => {
      const forked = fork(this.bin, args, {
        cwd,
        env: {
          ...npmRunPathEnv(),
          // Disable husky hooks because a plugin might be trying to install them, which will
          // break the install since the install location isn't a .git directory.
          HUSKY: '0',
        },
        execArgv: process.execArgv
          .join(' ')
          // Remove --loader ts-node/esm from execArgv so that the subprocess doesn't fail if it can't find ts-node.
          // The ts-node/esm loader isn't need to execute npm commands anyways.
          .replace('--loader ts-node/esm', '')
          .replace('--loader=ts-node/esm', '')
          .split(' ')
          .filter(Boolean),
        stdio: [0, null, null, 'ipc'],
      })

      forked.stderr?.setEncoding('utf8')
      forked.stderr?.on('data', (d: Buffer) => {
        if (this.verbose) process.stderr.write(d)
      })

      forked.stdout?.setEncoding('utf8')
      forked.stdout?.on('data', (d) => {
        if (this.verbose) process.stdout.write(d)
      })

      forked.on('error', reject)
      forked.on('exit', (code: number) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`${this.bin} ${args.join(' ')} exited with code ${code}`))
        }
      })
    })
  }

  async install(args: string[], opts: {cwd: string; prod?: boolean}): Promise<void> {
    const prod = opts.prod ? ['--omit', 'dev'] : []
    await this.exec(['install', ...args, ...prod], opts)
  }

  async show(args: string[], opts: {cwd: string}): Promise<void> {
    await this.exec(['show', ...args], opts)
  }

  async uninstall(args: string[], opts: {cwd: string}): Promise<void> {
    await this.exec(['uninstall', ...args], opts)
  }

  async update(args: string[], opts: {cwd: string}): Promise<void> {
    await this.exec(['update', ...args], opts)
  }
}
