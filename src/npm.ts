import {Errors, Interfaces, ux} from '@oclif/core'
import makeDebug from 'debug'
import {fork as cpFork} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {join, sep} from 'node:path'
import {npmRunPathEnv} from 'npm-run-path'

const debug = makeDebug('@oclif/plugin-plugins:npm')

type ExecOptions = {
  cwd: string
  verbose?: boolean
}

type InstallOptions = ExecOptions & {
  prod?: boolean
}

async function fork(modulePath: string, args: string[] = [], {cwd, verbose}: ExecOptions): Promise<void> {
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
      if (verbose) ux.logToStderr(d.toString())
      else debug(d.toString().trimEnd())
    })

    forked.stdout?.setEncoding('utf8')
    forked.stdout?.on('data', (d: Buffer) => {
      if (verbose) ux.log(d.toString())
      else debug(d.toString().trimEnd())
    })

    forked.on('error', reject)
    forked.on('exit', (code: number) => {
      if (code === 0) {
        resolve()
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
  private verbose: boolean | undefined

  public constructor({config, verbose}: {config: Interfaces.Config; verbose?: boolean}) {
    this.config = config
    this.verbose = verbose
  }

  async exec(args: string[] = [], options: ExecOptions): Promise<void> {
    const bin = await this.findNpm()
    debug('npm binary path', bin)
    if (this.verbose) args.push('--loglevel=verbose')
    if (this.config.npmRegistry) args.push(`--registry=${this.config.npmRegistry}`)

    if (this.verbose) {
      ux.logToStderr(`${options.cwd}: ${bin} ${args.join(' ')}`)
    }

    debug(`${options.cwd}: ${bin} ${args.join(' ')}`)
    try {
      await fork(bin, args, options)
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
    await this.exec(['view', ...args], {...opts, verbose: this.verbose})
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
