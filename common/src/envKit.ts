// Copyright © 2026 Jalapeno Labs

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
