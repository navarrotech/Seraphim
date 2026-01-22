// Copyright © 2026 Jalapeno Labs

import type { VoiceHotkey } from '../types'

// Misc
import { getDatabaseClient } from '../../database'
import { logFailed, logWarning } from '../../lib/logging'

export const fallbackVoiceHotkey: VoiceHotkey = {
  accelerator: 'Control+Num0',
}

export async function resolveVoiceHotkey(): Promise<VoiceHotkey> {
  const databaseClient = getDatabaseClient()
  if (!databaseClient) {
    logWarning('Voice hotkey fallback used because the database client is not available')
    return fallbackVoiceHotkey
  }

  try {
    const userSettings = await databaseClient.userSettings.findFirst()
    if (!userSettings) {
      logWarning('Voice hotkey fallback used because user settings were not found')
      return fallbackVoiceHotkey
    }

    if (!userSettings.voiceHotkey) {
      logWarning('Voice hotkey fallback used because the stored hotkey is empty')
      return fallbackVoiceHotkey
    }

    return {
      accelerator: userSettings.voiceHotkey,
    }
  }
  catch (error) {
    logFailed('Failed to resolve voice hotkey from database')
    console.error(error)
    return fallbackVoiceHotkey
  }
}
