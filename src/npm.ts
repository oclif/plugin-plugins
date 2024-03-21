import {Errors, Interfaces, ux} from '@oclif/core'
import makeDebug from 'debug'
import {fork as cpFork} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {join, sep} from 'node:path'
import {npmRunPathEnv} from 'npm-run-path'

import {LogLevel} from './log-level.js'

const debug = makeDebug('@oclif/plugin-plugins:npm')

type ExecOptions = {
  cwd: string
  logLevel: LogLevel
}

type InstallOptions = ExecOptions & {
  prod?: boolean
}

export type NpmOutput = {
  stderr: string[]
  stdout: string[]
}

async function fork(modulePath: string, args: string[] = [], {cwd, logLevel}: ExecOptions): Promise<NpmOutput> {
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
    const isNoisyLogLevel = logLevel !== 'silent'
    const stderr: string[] = []
    forked.stderr?.setEncoding('utf8')
    forked.stderr?.on('data', (d: Buffer) => {
      const output = d.toString().trimEnd()
      stderr.push(output)
      if (isNoisyLogLevel) ux.log(output)
      else debug(output)
    })

    const stdout: string[] = []
    forked.stdout?.setEncoding('utf8')
    forked.stdout?.on('data', (d: Buffer) => {
      const output = d.toString().trimEnd()
      stdout.push(output)
      if (isNoisyLogLevel) ux.log(output)
      else debug(output)
    })

    forked.on('error', reject)
    forked.on('exit', (code: number) => {
      if (code === 0) {
        resolve({stderr, stdout})
      } else {
        reject(
          new Errors.CLIError(`${modulePath} ${args.join(' ')} exited with code ${code}`, {
            suggestions: ['Run with DEBUG=@oclif/plugin-plugins* to see debug output.'],
          }),
        )
      }
    })
  })
}

export class NPM {
  private bin: string | undefined
  private config: Interfaces.Config
  private logLevel: LogLevel

  public constructor({config, logLevel}: {config: Interfaces.Config; logLevel: LogLevel}) {
    this.config = config
    this.logLevel = logLevel
  }

  async exec(args: string[] = [], options: ExecOptions): Promise<NpmOutput> {
    const bin = await this.findNpm()
    debug('npm binary path', bin)

    args.push(`--loglevel=${this.logLevel}`, '--no-fund')
    if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)

    if (options.logLevel !== 'notice' && options.logLevel !== 'silent') {
      ux.logToStderr(`${options.cwd}: ${bin} ${args.join(' ')}`)
    }

    debug(`${options.cwd}: ${bin} ${args.join(' ')}`)
    try {
      const output = await fork(bin, args, options)
      debug('npm done')
      return output
    } catch (error: unknown) {
      debug('npm error', error)
      throw error
    }
  }

  async install(args: string[], opts: InstallOptions): Promise<NpmOutput> {
    const prod = opts.prod ? ['--omit', 'dev'] : []
    return this.exec(['install', ...args, ...prod, '--no-audit'], opts)
  }

  async uninstall(args: string[], opts: ExecOptions): Promise<NpmOutput> {
    return this.exec(['uninstall', ...args], opts)
  }

  async update(args: string[], opts: ExecOptions): Promise<NpmOutput> {
    return this.exec(['update', ...args], opts)
  }

  async view(args: string[], opts: ExecOptions): Promise<NpmOutput> {
    return this.exec(['view', ...args], {...opts, logLevel: 'silent'})
  }

  /**
   * Get the path to the npm CLI file.
   * This will always resolve npm to the pinned version in `@oclif/plugin-plugins/package.json`.
   *
   * @returns The path to the `npm/bin/npm-cli.js` file.
   */
  private async findNpm(): Promise<string> {
    if (this.bin) return this.bin

    const npmPjsonPath = createRequire(import.meta.url).resolve('npm/package.json')
    const npmPjson = JSON.parse(await readFile(npmPjsonPath, {encoding: 'utf8'}))
    const npmPath = npmPjsonPath.slice(0, Math.max(0, npmPjsonPath.lastIndexOf(sep)))
    this.bin = join(npmPath, npmPjson.bin.npm)
    return this.bin
  }
}
