// Copyright © 2025 Jalapeno Labs

export const REGISTERED_ACTIONS = [
  'analyzeError',
  'writeJsDoc',
  'rewriteSelection',
  'writeUnitTests'
] as const

export const BLACKLIST_CHROME_LOGS_MATCHES: string[] = [
  'Download the React DevTools for a better development experience',
  'If you want to write it to the DOM, pass a string instead',
  '[vite]'
]

export const MAX_IMPORT_LINES_TO_USE = 5 as const
