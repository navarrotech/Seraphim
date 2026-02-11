// Copyright © 2026 Jalapeno Labs

// Utility
import { basename, extname } from 'node:path'

const TTY_EDITORS = new Set([
  'vi',
  'vim',
  'nvim',
  'nano',
  'emacs',
  'micro',
  'helix',
  'hx',
  'kak',
  'kakoune',
  'ne',
])

export function isTtyEditor(command: string): boolean {
  if (!command?.trim()) {
    console.debug('isTtyEditor received empty command', { command })
    return false
  }

  const baseName = basename(command.trim())
  const extension = extname(baseName)
  const normalized = extension ? baseName.slice(0, -extension.length) : baseName

  return TTY_EDITORS.has(normalized.toLowerCase())
}
