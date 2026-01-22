// Copyright © 2026 Jalapeno Labs

import type { Accelerator } from 'electron'

export type VoiceHotkey = {
  accelerator: Accelerator
}

export type VoiceHotkeyOptions = {
  hotkey?: VoiceHotkey
}

export type TranscriberStopResponse = {
  text?: string
}
