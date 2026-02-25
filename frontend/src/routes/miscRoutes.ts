// Copyright © 2026 Jalapeno Labs

// Core
import { frontendClient } from '@frontend/framework/api'

export function pingApi() {
  return frontendClient.get(`ping`).text()
}
