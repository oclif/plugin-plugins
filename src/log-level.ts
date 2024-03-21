import {Config} from '@oclif/core'

const LOG_LEVELS = ['silent', 'error', 'warn', 'notice', 'http', 'info', 'verbose', 'silly'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export function determineLogLevel(
  config: Config,
  flags: {silent?: boolean; verbose?: boolean},
  defaultLevel: LogLevel,
): LogLevel {
  if (flags.verbose) return 'verbose'
  if (flags.silent) return 'silent'

  const envVar = config.scopedEnvVar('NPM_LOG_LEVEL')
  if (LOG_LEVELS.includes(envVar as LogLevel)) return envVar as LogLevel

  return defaultLevel
}
