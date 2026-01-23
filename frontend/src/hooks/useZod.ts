// Copyright © 2026 Jalapeno Labs

import type { ZodType } from 'zod'
import type { LiteralUnion } from 'type-fest'

// Core
import { z } from 'zod'
import { useMemo } from 'react'

export function doZodValidation<Type extends ZodType>(
  schema: Type,
  guineaPig: z.infer<Type>,
): Partial<Record<LiteralUnion<keyof typeof guineaPig, string>, string[]>> {
  if (!schema) {
    return {}
  }

  // validate without throwing
  const result = schema.safeParse(guineaPig)

  if (result.success) {
    return {}
  }

  const fieldErrors: Record<string, string[]> = {}

  // flatten each issue into { 'path.to.field': 'message' }
  result.error.issues.forEach((issue) => {
    const path = issue.path.length
      ? issue.path.join('.')
      : '_'
    fieldErrors[path] = fieldErrors[path] || []

    fieldErrors[path].push(issue.message)
  })

  return fieldErrors as Partial<Record<LiteralUnion<keyof typeof guineaPig, string>, string[]>>
}

// Hook to validate data with a Zod schema and return a flat record of errors
export function useZod<Type extends ZodType>(
  schema: Type,
  guineaPig: z.infer<Type>,
): Partial<Record<LiteralUnion<keyof typeof guineaPig, string>, string[]>> {
  return useMemo(() => {
    return doZodValidation(schema, guineaPig)
  }, [ schema, guineaPig ])
}

export function useZodDescriptions(schema: ZodType): Record<string, string> {
  return useMemo(
    function computeDescriptions(): Record<string, string> {
      const descriptions: Record<string, string> = {}

      // walk the schema tree, accumulating dot-paths
      function traverse(s: ZodType, path = '') {
        const def = (s as any)._def

        if (!def) {
          console.warn('useZodDescriptions: No _def found for schema', s)
          return
        }

        // if this node was .describe(), record it
        if (def.description) {
          descriptions[path] = def.description
        }

        // if it's an object, dive into each property
        if (typeof def.shape === 'function') {
          const shape = def.shape()
          for (const key in shape) {
            const nextPath = path ? `${path}.${key}` : key
            traverse(shape[key], nextPath)
          }

          // unwrap single-child schemas (arrays, optionals, defaults, etc.)
        }
        else if (def.type) {
          traverse(def.type, path)
        }
      }

      traverse(schema)
      return descriptions
    },
    [ schema ],
  )
}
