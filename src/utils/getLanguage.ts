// Copyright © 2025 Jalapeno Labs

import type { ProgrammingLanguage } from '@/types'

export function getLanguage(filePath: string): ProgrammingLanguage {
  if (filePath.endsWith('.py')) {
    return 'python'
  }

  const isTypescript = filePath.endsWith('.ts')
    || filePath.endsWith('.tsx')
    || filePath.endsWith('.mjs')
    || filePath.endsWith('.cjs')
    || filePath.endsWith('.js')
    || filePath.endsWith('.jsx')

  if (isTypescript) {
    return 'typescript'
  }

  return 'other'
}
