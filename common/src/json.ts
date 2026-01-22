// Copyright © 2026 Jalapeno Labs

export function safeParseJson<Type = Record<string, any>>(jsonString: string, ...opts: any[]): Type | null {
  try {
    return JSON.parse(jsonString, ...opts) as Type
  }
  catch (error) {
    console.error('Failed to parse JSON:', error)
    return null
  }
}

export function safeStringifyJson<Type = Record<string, any>>(
  obj: Type,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number,
): string {
  try {
    return JSON.stringify(obj, replacer, space)
  }
  catch (error) {
    console.error('Failed to stringify JSON:', error)
    return undefined
  }
}
