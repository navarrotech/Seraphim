// Copyright © 2026 Jalapeno Labs

// Core
import ky from 'ky'
import { z } from 'zod'

// Lib
import { safeParseJson } from '@common/json'
import { API_PORT } from '@common/constants'

export const ApiRoot = `http://localhost:${API_PORT}`

export const apiClient = ky.create({
  prefixUrl: `${ApiRoot}/api`,
  throwHttpErrors: true,
  parseJson: safeParseJson,
  timeout: 60 * 1_000, // 1 minute
  retry: {
    limit: 2,
    methods: [ 'get' ],
    statusCodes: [
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ],
  },
})

export function buildUrlParams(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  for (let [ key, value ] of Object.entries(params)) {
    if (value == undefined) {
      continue
    }

    if (typeof value == 'number') {
      value = value.toString()
    }

    const normalizedValue: string = value?.trim()
    if (!normalizedValue) {
      continue
    }

    searchParams.append(key, normalizedValue)
  }

  return searchParams
}

export function parseRequestBeforeSend(zchema: z.ZodSchema, requestData: unknown) {
  // Should throw to block sending to the API!
  // Should return EXACTLY the same error shape as the API would if the validation fails
  // So that the frontend can handle it in a unified way
  return zchema.parse(requestData)
}
