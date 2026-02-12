// Copyright © 2026 Jalapeno Labs

export function safeParseJson<Type = Record<string, any>>(
  jsonString: string,
  reviver?: (this: any, key: string, value: any) => any,
  silent: boolean = false,
): Type | null {
  try {
    return JSON.parse(jsonString, reviver) as Type
  }
  catch (error) {
    if (!silent) {
      console.error('Failed to parse JSON:', error)
    }
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
