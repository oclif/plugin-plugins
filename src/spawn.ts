import {Errors, ux} from '@oclif/core'
import makeDebug from 'debug'
import {spawn as cpSpawn} from 'node:child_process'
import {npmRunPathEnv} from 'npm-run-path'

import {type LogLevel} from './log-level.js'

export type ExecOptions = {
  cwd: string
  logLevel: LogLevel
}

export type Output = {
  stderr: string[]
  stdout: string[]
}

const debug = makeDebug('@oclif/plugin-plugins:spawn')

/**
 * With `windowsVerbatimArguments`, Node joins the arguments with spaces and does no quoting, so an
 * argument containing whitespace reaches the child as several. Quote those the way
 * `CommandLineToArgvW` expects, which is what libuv does when arguments are not verbatim.
 */
export function quoteWindowsArg(arg: string): string {
  if ([...arg].every((char) => char !== '"' && char.trim() !== '')) return arg

  // Backslashes are literal except before a quote, so double the ones that end up before one: an
  // escaped quote inside the argument, or the closing quote.
  let quoted = '"'
  let backslashes = 0
  for (const char of arg) {
    if (char === '\\') {
      backslashes++
    } else {
      quoted += '\\'.repeat(char === '"' ? backslashes * 2 + 1 : backslashes) + char
      backslashes = 0
    }
  }

  return `${quoted}${'\\'.repeat(backslashes * 2)}"`
}

export async function spawn(modulePath: string, args: string[] = [], {cwd, logLevel}: ExecOptions): Promise<Output> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') args = args.map((arg) => quoteWindowsArg(arg))
    let argv0: string | undefined
    if (modulePath.endsWith('.js')) {
      const quote = process.platform === 'win32' ? `"${modulePath}"` : modulePath
      args.unshift(quote)
      modulePath = process.execPath
      if (process.platform === 'win32' && modulePath.includes(' ')) {
        argv0 = `"${modulePath}"`
      }
    }

    debug('modulePath', modulePath)
    debug('args', args)
    const spawned = cpSpawn(modulePath, args, {
      cwd,
      env: {
        ...npmRunPathEnv({cwd}),
        // Disable husky hooks because a plugin might be trying to install them, which will
        // break the install since the install location isn't a .git directory.
        HUSKY: '0',
      },
      stdio: 'pipe',
      windowsVerbatimArguments: true,
      ...(argv0 && {argv0}),
      ...(process.platform === 'win32' && modulePath.toLowerCase().endsWith('.cmd') && {shell: true}),
    })

    const possibleLastLinesOfNpmInstall = ['up to date', 'added']
    const stderr: string[] = []
    const stdout: string[] = []
    const loggedStderr: string[] = []
    const loggedStdout: string[] = []

    const shouldPrint = (str: string): boolean => {
      // For ux cleanliness purposes, don't print the final line of npm install output if
      // the log level is 'notice' and there's no other output.
      const isNoOtherOutput = loggedStderr.length === 0 && loggedStdout.length === 0
      const isLastLine = possibleLastLinesOfNpmInstall.some((line) => str.startsWith(line))
      if (isNoOtherOutput && isLastLine && logLevel === 'notice') {
        return false
      }

      return logLevel !== 'silent'
    }

    spawned.stderr?.setEncoding('utf8')
    spawned.stderr?.on('data', (d: Buffer) => {
      const output = d.toString().trim()
      stderr.push(output)
      if (shouldPrint(output)) {
        loggedStderr.push(output)
        ux.stdout(output)
      } else debug(output)
    })

    spawned.stdout?.setEncoding('utf8')
    spawned.stdout?.on('data', (d: Buffer) => {
      const output = d.toString().trim()
      stdout.push(output)
      if (shouldPrint(output)) {
        loggedStdout.push(output)
        ux.stdout(output)
      } else debug(output)
    })

    spawned.on('error', reject)
    spawned.on('exit', (code: number) => {
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
