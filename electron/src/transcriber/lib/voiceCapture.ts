// Copyright © 2026 Jalapeno Labs

// Misc
import { logWarning } from '../../lib/logging'
import { startTranscriptionSession, stopTranscriptionSession } from './transcriberClient'

let isRecording = false

async function startVoiceCapture(): Promise<void> {
  if (isRecording) {
    logWarning('Voice capture start requested while already recording')
    return
  }

  isRecording = true
  await startTranscriptionSession()
}

async function stopVoiceCapture(): Promise<void> {
  if (!isRecording) {
    logWarning('Voice capture stop requested while not recording')
    return
  }

  isRecording = false
  const transcript = await stopTranscriptionSession()
  if (transcript) {
    console.log(transcript)
  }
}

export async function toggleVoiceCapture(): Promise<void> {
  if (isRecording) {
    await stopVoiceCapture()
    return
  }

  await startVoiceCapture()
}
