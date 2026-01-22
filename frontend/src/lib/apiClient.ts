// Copyright © 2026 Jalapeno Labs

// Lib
import ky from 'ky'

// Misc
import { API_PREFIX_URL } from '../constants'

export const apiClient = ky.create({
  prefixUrl: API_PREFIX_URL,
})
