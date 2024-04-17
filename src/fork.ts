import {Errors, ux} from '@oclif/core'
import makeDebug from 'debug'
import {fork as cpFork} from 'node:child_process'
import {npmRunPathEnv} from 'npm-run-path'

import {LogLevel} from './log-level.js'

export type ExecOptions = {
  cwd: string
  logLevel: LogLevel
}

export type Output = {
  stderr: string[]
  stdout: string[]
}

const debug = makeDebug('@oclif/plugin-plugins:fork')

export async function fork(modulePath: string, args: string[] = [], {cwd, logLevel}: ExecOptions): Promise<Output> {
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
        // The ts-node/esm loader isn't need to execute npm or yarn commands anyways.
        .replace('--loader ts-node/esm', '')
        .replace('--loader=ts-node/esm', '')
        .split(' ')
        .filter(Boolean),
      stdio: [0, null, null, 'ipc'],
    })

    const possibleLastLinesOfNpmInstall = ['up to date', 'added']
    const stderr: string[] = []
    const stdout: string[] = []
    const loggedStderr: string[] = []
    const loggedStdout: string[] = []

    const shouldPrint = (str: string): boolean => {
      // For ux cleanliness purposes, don't print the final line of npm install output if
      // the log level is 'notice' and there's no other output.
      const noOtherOutput = loggedStderr.length === 0 && loggedStdout.length === 0
      const isLastLine = possibleLastLinesOfNpmInstall.some((line) => str.startsWith(line))
      if (noOtherOutput && isLastLine && logLevel === 'notice') {
        return false
      }

      return logLevel !== 'silent'
    }

    forked.stderr?.setEncoding('utf8')
    forked.stderr?.on('data', (d: Buffer) => {
      const output = d.toString().trim()
      stderr.push(output)
      if (shouldPrint(output)) {
        loggedStderr.push(output)
        ux.log(output)
      } else debug(output)
    })

    forked.stdout?.setEncoding('utf8')
    forked.stdout?.on('data', (d: Buffer) => {
      const output = d.toString().trim()
      stdout.push(output)
      if (shouldPrint(output)) {
        loggedStdout.push(output)
        ux.log(output)
      } else debug(output)
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
