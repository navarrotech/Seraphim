// Copyright © 2026 Jalapeno Labs

import chalk from 'chalk'

export function logFailed(text: string) {
  console.log(`[${chalk.red('Failed')}] ${text}`)
}

export function logWarning(text: string) {
  console.log(`[${chalk.yellow('Warning')}] ${text}`)
}

export function logSuccess(text: string) {
  console.log(`[${chalk.green('Success')}] ${text}`)
}
