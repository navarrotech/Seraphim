// Copyright © 2026 Jalapeno Labs

// Project Configuration
export const CONFIG_FILE_NAME = 'seraphim.jsonc' as const

// User Settings
export const USER_LANGUAGE_OPTIONS = [ 'auto', 'en-US' ] as const
export const USER_THEME_OPTIONS = [ 'system', 'dark', 'light' ] as const
export const DEFAULT_USER_LANGUAGE = 'auto' as const
export const DEFAULT_USER_THEME = 'system' as const
export const DEFAULT_VOICE_ENABLED = true as const
export const DEFAULT_VOICE_HOTKEY = 'Control+Num0' as const

// Docker shenanigans
export const DEFAULT_DOCKER_BASE_IMAGE = 'node:lts-krypton' as const
export const DOCKER_USERNAME = 'steve' as const
