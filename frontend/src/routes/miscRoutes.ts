// Copyright © 2026 Jalapeno Labs

// Core
import { apiClient } from '@common/api'

export function pingApi() {
  return apiClient.get(`ping`).text()
}
