// Copyright © 2025 Jalapeno Labs

const functionRegex = /\bfunction\s+([A-Za-z$_][A-Za-z0-9$_]*)\s*(?:<.*>)?\s*\(/

export function getFunctionName(selection: string): string | null {
  const match = functionRegex.exec(selection)
  return match ? match[1] : null
}
