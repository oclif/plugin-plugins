import {Interfaces} from '@oclif/core'
import makeDebug from 'debug'
import {fork as cpFork} from 'node:child_process'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {npmRunPathEnv} from 'npm-run-path'

import {LogLevel} from './log-level.js'

const debug = makeDebug('@oclif/plugin-plugins:npm')

const require = createRequire(import.meta.url)

type ExecOptions = {
  cwd: string
  silent?: boolean
}

type InstallOptions = ExecOptions & {
  prod?: boolean
}

async function fork(modulePath: string, args: string[] = [], {cwd, silent}: ExecOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const forked = cpFork(modulePath, args, {
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
      if (!silent) process.stderr.write(d)
    })

    forked.stdout?.setEncoding('utf8')
    forked.stdout?.on('data', (d) => {
      if (!silent) process.stdout.write(d)
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

export class NPM {
  private bin: string
  private config: Interfaces.Config
  private logLevel: LogLevel | undefined

  public constructor({config, logLevel}: {config: Interfaces.Config; logLevel?: LogLevel}) {
    this.config = config
    this.logLevel = logLevel
    this.bin = require.resolve('.bin/npm', {paths: [this.config.root, fileURLToPath(import.meta.url)]})
    debug('npm binary path', this.bin)
  }

  async exec(args: string[] = [], options: ExecOptions): Promise<void> {
    if (this.logLevel) args.push(`--loglevel=${this.logLevel}`)
    if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)

    if (this.logLevel && this.logLevel !== 'silent') {
      process.stderr.write(`${options.cwd}: ${this.bin} ${args.join(' ')}`)
    }

    debug(`${options.cwd}: ${this.bin} ${args.join(' ')}`)
    try {
      await fork(this.bin, args, options)
      debug('npm done')
    } catch (error: unknown) {
      debug('npm error', error)
      throw error
    }
  }

  async install(args: string[], opts: InstallOptions): Promise<void> {
    const prod = opts.prod ? ['--omit', 'dev'] : []
    await this.exec(['install', ...args, ...prod], opts)
  }

  async uninstall(args: string[], opts: ExecOptions): Promise<void> {
    await this.exec(['uninstall', ...args], opts)
  }

  async update(args: string[], opts: ExecOptions): Promise<void> {
    await this.exec(['update', ...args], opts)
  }

  async view(args: string[], opts: ExecOptions): Promise<void> {
    await this.exec(['view', ...args], {...opts, silent: this.logLevel === 'silent'})
  }
}
