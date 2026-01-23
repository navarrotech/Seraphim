// Copyright © 2026 Jalapeno Labs

// Lib
import ky from 'ky'

const API_ROOT = window?.config?.getApiUrl?.() || 'http://localhost'

export const apiClient = ky.create({
  prefixUrl: `${API_ROOT}/api`,
  throwHttpErrors: true,
})
