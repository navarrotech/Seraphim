// Copyright © 2026 Jalapeno Labs

export type VoiceHotkey = {
  accelerator: string
}

export type VoiceHotkeyOptions = {
  hotkey?: VoiceHotkey
}

export type TranscriberStopResponse = {
  text?: string
}
