// Copyright © 2025 Jalapeno Labs

import type { AnyObjectSchema } from 'yup'
import { removeBackticks, stripInnerBackticks } from './stripBackticks'

export function getPromptJson<Shape = Record<string, any>>(
  response: string,
  validator: AnyObjectSchema
): Shape | null {
  const jsonString = stripInnerBackticks(
    removeBackticks(response)
  )

  // There may be another nested set of backticks, but within the JSON string.
  // We need to remove those as well.

  try {
    const parsed = JSON.parse(jsonString) as Shape

    const isValid = validator.isValidSync(parsed, {
      abortEarly: false,
      strict: true,
      recursive: true,
      disableStackTrace: true,
      stripUnknown: true
    })

    if (!isValid) {
      console.warn('[PROMPTS]: Unable to parse the returned JSON response:', response)
      return null
    }

    return parsed
  }
  catch {
    return null
  }
}
