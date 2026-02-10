// Copyright © 2026 Jalapeno Labs

export function maskToken(value: string, visibleChars = 8, visibleStars = 4): string {
  if (!value) {
    console.debug('maskToken received an empty value')
    return value
  }

  if (value.length <= visibleChars) {
    return value
  }

  visibleStars = visibleStars ?? value.length - visibleChars

  return `${value.slice(0, visibleChars)}${'*'.repeat(visibleStars)}`
}
