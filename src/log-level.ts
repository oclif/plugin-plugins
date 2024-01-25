import {Flags} from '@oclif/core'

const LOG_LEVELS = ['silent', 'error', 'warn', 'notice', 'http', 'info', 'verbose', 'silly'] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

export const npmLogLevelFlag = Flags.option({
  char: 'l',
  default: 'notice',
  options: LOG_LEVELS,
  summary: 'Set the npm --loglevel flag for all npm executions.',
})

export const determineLogLevel = (flags: {
  'npm-log-level'?: LogLevel
  silent?: boolean
  verbose?: boolean
}): LogLevel => {
  if (flags['npm-log-level']) return flags['npm-log-level']
  if (flags.silent) return 'silent'
  if (flags.verbose) return 'verbose'
  return 'notice'
}
