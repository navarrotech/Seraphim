// Copyright © 2025 Jalapeno Labs

// Language settings
export const SUPPORTED_LANGUAGES = [
  'en-US'
] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en-US'

// Port settings
export const PORT = 9841
