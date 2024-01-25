import {Interfaces} from '@oclif/core'
import makeDebug from 'debug'
import {fork} from 'node:child_process'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {npmRunPathEnv} from 'npm-run-path'

const debug = makeDebug('@oclif/plugin-plugins:npm')

const require = createRequire(import.meta.url)

export type PackageManagerExecOptions = {
  cwd: string
  silent: boolean
  verbose: boolean
}

export type InstallOptions = PackageManagerExecOptions & {
  prod?: boolean
}

export class NPM {
  private bin: string
  private config: Interfaces.Config

  public constructor({config}: {config: Interfaces.Config}) {
    this.config = config
    this.bin = require.resolve('.bin/npm', {paths: [this.config.root, fileURLToPath(import.meta.url)]})
  }

  async exec(args: string[] = [], opts: PackageManagerExecOptions): Promise<void> {
    debug('npm binary path', this.bin)
    const {cwd, silent, verbose} = opts

    if (verbose) args.push('--loglevel=verbose')
    if (silent && !verbose) args.push('--loglevel=silent')
    if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)

    if (verbose) {
      process.stderr.write(`${cwd}: ${this.bin} ${args.join(' ')}`)
    }

    debug(`${cwd}: ${this.bin} ${args.join(' ')}`)
    try {
      await this.fork(args, opts)
      debug('npm done')
    } catch (error: unknown) {
      debug('npm error', error)
      throw error
    }
  }

  async fork(args: string[] = [], options: PackageManagerExecOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const forked = fork(this.bin, args, {
        cwd: options.cwd,
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
        if (options.verbose) process.stderr.write(d)
      })

      forked.stdout?.setEncoding('utf8')
      forked.stdout?.on('data', (d) => {
        if (options.verbose) process.stdout.write(d)
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

  async install(args: string[], opts: InstallOptions): Promise<void> {
    const prod = opts.prod ? ['--omit', 'dev'] : []
    await this.exec(['install', ...args, ...prod], opts)
  }

  async show(args: string[], opts: PackageManagerExecOptions): Promise<void> {
    await this.exec(['show', ...args], opts)
  }

  async uninstall(args: string[], opts: PackageManagerExecOptions): Promise<void> {
    await this.exec(['uninstall', ...args], opts)
  }

  async update(args: string[], opts: PackageManagerExecOptions): Promise<void> {
    await this.exec(['update', ...args], opts)
  }
}
