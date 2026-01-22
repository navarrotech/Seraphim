// Copyright © 2026 Jalapeno Labs

import type { CorsOptions } from 'cors'

import { isProduction } from '../env'
import { APP_ORIGIN, DEV_FRONTEND_ORIGIN } from '../constants'

export function createCorsOptions(): CorsOptions {
  if (isProduction) {
    return {
      origin: APP_ORIGIN,
      credentials: true,
      methods: [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS' ],
    }
  }

  return {
    origin: DEV_FRONTEND_ORIGIN,
    credentials: true,
    methods: [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS' ],
  }
}
