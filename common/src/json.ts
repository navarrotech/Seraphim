// Copyright © 2026 Jalapeno Labs

import type { AnyZodObject } from 'zod'

import { parse } from 'jsonc-parser'

/**
 * Safely parses a JSON string, returning `null` on syntax errors.
 *
 * @typeParam Shape The expected shape of the parsed value.
 * @param {string} text The JSON string to parse.
 * @returns {Shape | null} The parsed value or null if invalid JSON.
 */
export function safeParseJson<Shape = Record<string, any>>(
  text?: string,
  validator?: AnyZodObject,
  failOnBadValidation: boolean = false,
): Shape | null {
  if (!text) {
    return null
  }

  try {
    // Using the JSONc parser, because it is more robust and can handle json and jsonc (comments, trailing commas, etc)
    const object = parse(text, null, { allowTrailingComma: true }) as Shape

    // If a validator schema was provided, validate the parsed object.
    // Whether validation should pass/fail is up to the parent function.
    if (validator) {
      const result = validator.safeParse(object)
      if (!result.success) {
        if (failOnBadValidation) {
          console.error('JSON parsing validation failed:', result.error)
          return null
        }
        console.warn('JSON parsing validation failed, but still continuing...', result.error)
      }
    }

    return object
  }
  catch {
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
