// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'

export function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  const parsed = Number.parseInt(normalized, 10)

  if (Number.isNaN(parsed) || Number.isFinite(parsed) === false) {
    return defaultValue
  }

  if (!Number.isInteger(parsed)) {
    return Math.round(parsed)
  }

  return parsed
}

export function parseEnvNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  const parsed = Number.parseInt(normalized, 10)

  if (Number.isNaN(parsed) || Number.isFinite(parsed) === false) {
    return defaultValue
  }

  return parsed
}

const trueValues: Record<string, boolean> = {
  'true': true,
  '1': true,
  'y': true,
  'yes': true,
  'on': true,
}

export function parseEnvBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()

  if (normalized in trueValues) {
    return true
  }

  return false
}

export function convertEnvironmentToDotEnv(environment: Environment[]): string {
  let result: string = ''

  for (const env of environment) {
    const key = env.key?.trim() ?? ''
    const value = env.value?.trim() ?? ''

    if (!key && !value) {
      continue
    }

    result += `${key}=${value}\n`
  }

  return result.trim() + '\n'
}

export function convertDotEnvToEnvironment(dotEnv: string): Environment[] {
  const asLines = dotEnv.split('\n')
  const result: Environment[] = []

  for (let line of asLines) {
    line = line?.trim()

    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue
    }

    const equalsIndex = line.indexOf('=')
    if (equalsIndex < 0) {
      const key = line.trim()
      result.push({ key, value: '' })
      continue
    }

    const key = line
      .substring(0, equalsIndex)
      .trim()
      // Trim start/end quotes in the value:
      .replace(/^["']|["']$/g, '')
      || ''

    const value = line
      .substring(equalsIndex + 1)
      .trim()
      // Trim start/end quotes in the value:
      .replace(/^["']|["']$/g, '')
      || ''

    if (!key && !value) {
      continue
    }

    result.push({ key, value })
  }

  return result
}
