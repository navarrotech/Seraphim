// Copyright © 2025 Jalapeno Labs

export function stringify(...values: any[]): string {
  if (values.length === 0) {
    return ''
  }

  let together: string = ''
  for (const value of values) {
    if (value === undefined || value === null) {
      continue
    }

    if (value instanceof Error) {
      together += `Error: ${value.name} - ${value.message}`
      if (value.stack) {
        together += `Stack: ${value.stack}`
      }
      continue
    }

    if (typeof value === 'object') {
      try {
        together += JSON.stringify(value, null, 2)
      }
      catch (error) {
        console.error('Error stringifying object:', error)
        together += String(error)
      }
      continue
    }

    together += String(value)
  }

  return together.trim()
}
