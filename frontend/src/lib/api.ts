// Copyright © 2026 Jalapeno Labs

// Lib
import ky from 'ky'

export function getApiRoot(): string {
  return window?.config?.getApiUrl?.() || 'http://localhost'
}

export const apiClient = ky.create({
  prefixUrl: `${getApiRoot()}/api`,
  throwHttpErrors: true,
})
