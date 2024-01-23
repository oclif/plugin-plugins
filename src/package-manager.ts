import {Interfaces, ux} from '@oclif/core'
import makeDebug from 'debug'
import {fork} from 'node:child_process'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import NpmRunPath from 'npm-run-path'

const debug = makeDebug('cli:yarn')

const require = createRequire(import.meta.url)

export type PackageManagerExecOptions = {
  cwd: string
  noSpinner?: boolean
  silent: boolean
  verbose: boolean
}

export type InstallOptions = PackageManagerExecOptions & {
  prod?: boolean
}

export abstract class PackageManager {
  protected config: Interfaces.Config

  constructor({config}: {config: Interfaces.Config}) {
    this.config = config
  }

  abstract exec(args: string[], opts: PackageManagerExecOptions): Promise<void>
  abstract install(args: string[], opts: InstallOptions): Promise<void>
  abstract get name(): 'npm' | 'yarn'
  abstract refresh(args: string[], opts: InstallOptions): Promise<void>
  abstract uninstall(args: string[], opts: PackageManagerExecOptions): Promise<void>
  abstract update(args: string[], opts: PackageManagerExecOptions): Promise<void>
}

export class NPM extends PackageManager {
  public get name(): 'npm' {
    return 'npm'
  }

  async exec(args: string[] = [], opts: PackageManagerExecOptions): Promise<void> {
    const bin = require.resolve('.bin/npm', {paths: [this.config.root, fileURLToPath(import.meta.url)]})
    debug('npm binary path', bin)
    const {cwd, silent, verbose} = opts
    if (args[0] !== 'run') {
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
        // Remove --loader ts-node/esm from execArgv so that the subprocess doesn't fail if it can't find ts-node.
        .replace('--loader ts-node/esm', '')
        .replace('--loader=ts-node/esm', '')
        .split(' ')
        .filter(Boolean),
      stdio: [0, null, null, 'ipc'],
    }

    if (verbose) {
      process.stderr.write(`${cwd}: ${bin} ${args.join(' ')}`)
    }

    debug(`${cwd}: ${bin} ${args.join(' ')}`)
    try {
      await this.fork(bin, args, options)
      debug('npm done')
    } catch (error: unknown) {
      debug('npm error', error)
      throw error
    }
  }

  fork(modulePath: string, args: string[] = [], options: PackageManagerExecOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const forked = fork(modulePath, args, {
        ...options,
        env: {
          ...process.env,
          // Disable husky hooks because a plugin might be trying to install them, which will
          // break the install since the install location isn't a .git directory.
          HUSKY: '0',
        },
      })
      forked.stderr?.on('data', (d: Buffer) => {
        if (!options.silent) {
          const str = d.toString()
          process.stderr.write(str)
        }
      })
      forked.stdout?.setEncoding('utf8')
      forked.stdout?.on('data', (d) => {
        if (options.verbose) process.stdout.write(d)
        else if (!options.noSpinner) ux.action.status = d.replace(/\n$/, '').split('\n').pop()
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

  async install(args: string[], opts: InstallOptions): Promise<void> {
    const prod = opts.prod ? ['--omit', 'dev'] : []
    await this.exec(['install', ...args, ...prod, '--json'], opts)
  }

  async refresh(args: string[], opts: InstallOptions): Promise<void> {
    const prod = opts.prod ? ['--omit', 'dev'] : []
    await this.exec(['install', ...args, ...prod], opts)
  }

  async uninstall(args: string[], opts: PackageManagerExecOptions): Promise<void> {
    await this.exec(['uninstall', ...args], opts)
  }

  async update(args: string[], opts: PackageManagerExecOptions): Promise<void> {
    await this.exec(['update', ...args], opts)
  }
}
