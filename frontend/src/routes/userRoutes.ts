// Copyright © 2026 Jalapeno Labs

import type { UserSettings, UserWithSettings } from '@common/types'
import type { UserSettingsUpdateRequest } from '@common/schema'

// Core
import { apiClient } from '@common/api'

// Redux
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { dispatch } from '@frontend/framework/store'

type GetCurrentUserResponse = {
  user: UserWithSettings
}

export async function getCurrentUser() {
  const response = await apiClient
    .get('v1/protected/users/me')
    .json<GetCurrentUserResponse>()

  dispatch(
    settingsActions.setSettings(response.user.settings),
  )

  return response
}

type UpdateCurrentUserSettingsResponse = {
  settings: UserSettings
}

export async function updateCurrentUserSettings(body: UserSettingsUpdateRequest) {
  const response = await apiClient
    .patch('v1/protected/users/me/settings', { json: body })
    .json<UpdateCurrentUserSettingsResponse>()

  dispatch(
    settingsActions.setSettings(response.settings),
  )

  return response
}
