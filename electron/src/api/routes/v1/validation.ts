// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { ZodType } from 'zod'

type ValidationOptions = {
  context: string
  errorMessage: string
}

type ValidationLocation = 'params' | 'body' | 'query'

function logValidationFailure(
  location: ValidationLocation,
  options: ValidationOptions,
  request: Request,
  issues: Array<{ path: Array<string | number>; message: string }>,
): void {
  let payload: unknown = request.body
  if (location === 'params') {
    payload = request.params
  }
  else if (location === 'query') {
    payload = request.query
  }

  console.debug(`${options.context} ${location} failed validation`, {
    issues,
    [location]: payload,
  })
}

export function parseRequestParams<Shape>(
  schema: ZodType<Shape>,
  request: Request,
  response: Response,
  options: ValidationOptions,
): Shape | null {
  const validation = schema.safeParse(request.params)
  if (!validation.success) {
    logValidationFailure('params', options, request, validation.error.issues)
    response.status(400).json({ error: options.errorMessage })
    return null
  }

  return validation.data
}

export function parseRequestBody<Shape>(
  schema: ZodType<Shape>,
  request: Request,
  response: Response,
  options: ValidationOptions,
): Shape | null {
  const validation = schema.safeParse(request.body)
  if (!validation.success) {
    logValidationFailure('body', options, request, validation.error.issues)
    response.status(400).json({ error: options.errorMessage })
    return null
  }

  return validation.data
}

export function parseRequestQuery<Shape>(
  schema: ZodType<Shape>,
  request: Request,
  response: Response,
  options: ValidationOptions,
): Shape | null {
  const validation = schema.safeParse(request.query)
  if (!validation.success) {
    logValidationFailure('query', options, request, validation.error.issues)
    response.status(400).json({ error: options.errorMessage })
    return null
  }

  return validation.data
}
