// Copyright Ac 2026 Jalapeno Labs

import type { User, UserSettings } from '@prisma/client'

// Misc
import { apiClient } from '../api'

type GetCurrentUserResponse = {
  user: User & { settings: UserSettings | null }
}

export function getCurrentUser() {
  return apiClient
    .get('v1/protected/users/me')
    .json<GetCurrentUserResponse>()
}
