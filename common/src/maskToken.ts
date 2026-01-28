// Copyright © 2026 Jalapeno Labs
export function maskToken(value: string, visibleChars = 8) {
  if (!value) {
    console.debug('maskToken received an empty value')
    return value
  }

  if (value.length <= visibleChars) {
    return value
  }

  return `${value.slice(0, visibleChars)}${'*'.repeat(value.length - visibleChars)}`
}
