// Copyright © 2026 Jalapeno Labs

import type { VoiceHotkey, VoiceHotkeyOptions } from '../types'

// Core
import { globalShortcut } from 'electron'

// Misc
import { logFailed, logWarning } from '../../lib/logging'
import { toggleVoiceCapture } from './voiceCapture'
import { fallbackVoiceHotkey, resolveVoiceHotkey } from './voiceHotkeySettings'

let activeHotkey: VoiceHotkey = fallbackVoiceHotkey

function handleToggleCaptureError(error: unknown): void {
  logFailed('Voice capture toggle failed')
  console.error(error)
}

function handleHotkeyPressed(): void {
  void toggleVoiceCapture().catch(handleToggleCaptureError)
}

function clearExistingHotkey(hotkey: VoiceHotkey): void {
  if (!hotkey.accelerator) {
    logWarning('Skipping hotkey unregister because no accelerator is defined')
    return
  }

  globalShortcut.unregister(hotkey.accelerator)
}

export async function registerVoiceHotkeyListener(options?: VoiceHotkeyOptions): Promise<void> {
  const requestedHotkey = options?.hotkey
  const resolvedHotkey = requestedHotkey ?? await resolveVoiceHotkey()
  const previousHotkey = activeHotkey
  activeHotkey = resolvedHotkey

  clearExistingHotkey(previousHotkey)

  if (!activeHotkey.accelerator) {
    logWarning('Voice hotkey registration skipped because no accelerator was provided')
    return
  }

  const didRegister = globalShortcut.register(activeHotkey.accelerator, handleHotkeyPressed)
  if (!didRegister) {
    logFailed('Failed to register voice hotkey listener')
  }
}
