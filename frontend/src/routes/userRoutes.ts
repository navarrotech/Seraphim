// Copyright © 2026 Jalapeno Labs

import type { User, UserSettings } from '@common/types'
import type { UserSettingsUpdateRequest } from '@common/schema'

// Misc
import { apiClient } from '../../../common/src/api'

type GetCurrentUserResponse = {
  user: User & { settings: UserSettings | null }
}

export function getCurrentUser() {
  return apiClient
    .get('v1/protected/users/me')
    .json<GetCurrentUserResponse>()
}

type UpdateCurrentUserSettingsResponse = {
  settings: UserSettings
}

export function updateCurrentUserSettings(body: UserSettingsUpdateRequest) {
  return apiClient
    .patch('v1/protected/users/me/settings', { json: body })
    .json<UpdateCurrentUserSettingsResponse>()
}
