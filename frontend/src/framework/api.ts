// Copyright © 2026 Jalapeno Labs

// Core
import { apiClient } from '@common/api'
import { safeParseJson } from '@common/json'
import { doToast } from './toast'

export const frontendClient = apiClient.extend({
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        if (!response.ok) {
          try {
            const asText = await response.text()
            const payload = safeParseJson<{ message?: string }>(asText)

            if (payload.message) {
              doToast({
                title: 'Request failed',
                description: payload.message,
                color: 'danger',
              })
            }

            // @ts-ignore
            response.json = () => Promise.resolve(payload)
            response.text = () => Promise.resolve(asText)
          }
          catch (error) {
            console.error(error)
          }
        }
      },
    ],
  },
})
