// Copyright © 2026 Jalapeno Labs

import type { TranscriberStopResponse } from '../types'

// Lib
import ky from 'ky'

// Misc
import {
  TRANSCRIBER_BASE_URL,
  TRANSCRIBER_START_PATH,
  TRANSCRIBER_STOP_PATH,
} from '../../constants'
import { logFailed, logWarning } from '../../lib/logging'

const transcriberClient = ky.create({
  prefixUrl: TRANSCRIBER_BASE_URL,
  timeout: 60_000,
})

export async function startTranscriptionSession(): Promise<void> {
  try {
    await transcriberClient.post(TRANSCRIBER_START_PATH)
  }
  catch (error) {
    logFailed('Failed to start transcriber session')
    console.error(error)
  }
}

export async function stopTranscriptionSession(): Promise<string | null> {
  try {
    const response = await transcriberClient.post(TRANSCRIBER_STOP_PATH).json<TranscriberStopResponse>()
    if (!response.text) {
      logWarning('Transcriber stopped but no text was returned')
      return null
    }

    return response.text
  }
  catch (error) {
    logFailed('Failed to stop transcriber session')
    console.error(error)
    return null
  }
}
