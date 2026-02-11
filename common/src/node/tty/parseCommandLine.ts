// Copyright © 2026 Jalapeno Labs

export type ParsedCommandLine = {
  command: string
  args: string[]
}

export function parseCommandLine(input: string): ParsedCommandLine | null {
  if (!input?.trim()) {
    console.debug('parseCommandLine received empty input', { input })
    return null
  }

  const trimmedInput = input.trim()
  const tokens: string[] = []
  let currentToken = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let isEscaping = false

  for (const character of trimmedInput) {
    if (isEscaping) {
      currentToken += character
      isEscaping = false
      continue
    }

    if (character === '\\' && !inSingleQuote) {
      isEscaping = true
      continue
    }

    if (character === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (character === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (/\s/.test(character) && !inSingleQuote && !inDoubleQuote) {
      if (currentToken) {
        tokens.push(currentToken)
        currentToken = ''
      }
      continue
    }

    currentToken += character
  }

  if (isEscaping) {
    console.debug('parseCommandLine encountered trailing escape', { input })
    currentToken += '\\'
  }

  if (currentToken) {
    tokens.push(currentToken)
  }

  if (inSingleQuote || inDoubleQuote) {
    console.debug('parseCommandLine encountered unterminated quotes', {
      input,
      inSingleQuote,
      inDoubleQuote,
    })
  }

  if (!tokens.length) {
    console.debug('parseCommandLine produced no tokens', { input })
    return null
  }

  return {
    command: tokens[0],
    args: tokens.slice(1),
  }
}
