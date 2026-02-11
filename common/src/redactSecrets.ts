// Copyright © 2026 Jalapeno Labs

export function redactSecrets(
  message: string,
  secrets: string[],
  maskLength: number = 8,
): string {
  if (typeof message !== 'string' || !Array.isArray(secrets) || secrets.length === 0) {
    console.debug('redactSecrets called with invalid parameters, returning original message')
    return message
  }

  const safeMaskLength = Number.isFinite(maskLength) && maskLength > 0 ? Math.floor(maskLength) : 8
  const replacementMask = '*'.repeat(safeMaskLength)

  const uniqueNonEmptySecrets = Array.from(
    new Set(
      secrets
        .map((secretValue) => (typeof secretValue === 'string' ? secretValue : ''))
        .filter((secretValue) => secretValue.length > 0),
    ),
  ).sort((firstSecret, secondSecret) => secondSecret.length - firstSecret.length)

  let redactedMessage = message

  for (const secretValue of uniqueNonEmptySecrets) {
    const escapedSecretForRegex = secretValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const secretMatchPattern = new RegExp(escapedSecretForRegex, 'gi')

    redactedMessage = redactedMessage.replace(secretMatchPattern, replacementMask)
  }

  return redactedMessage
}
