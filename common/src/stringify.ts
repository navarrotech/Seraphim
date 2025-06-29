// Copyright © 2025 Jalapeno Labs

export function stringify(...values: any[]): string {
  if (values.length === 0) {
    return ''
  }

  const together: string[] = []
  for (const value of values) {
    if (value === undefined || value === null) {
      continue
    }

    if (value instanceof Error) {
      together.push(`Error: ${value.name} - ${value.message}`)
      if (value.stack) {
        together.push(`Stack: ${value.stack}`)
      }
      continue
    }

    if (typeof value === 'object') {
      try {
        together.push(JSON.stringify(value, null, 2))
      }
      catch (error) {
        console.error('Error stringifying object:', error)
        together.push(String(error))
      }
      continue
    }

    together.push(String(value))
  }

  return together.join(' ').trim()
}
