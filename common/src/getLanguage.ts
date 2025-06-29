// Copyright © 2025 Jalapeno Labs

import type { ProgrammingLanguage } from './types'

export function getLanguage(filePath: string): ProgrammingLanguage {
  if (filePath.endsWith('.py')) {
    return 'python'
  }

  if (filePath.endsWith('.ts')) {
    return 'typescript'
  }

  if (filePath.endsWith('.tsx')) {
    return 'typescript-react'
  }

  if (filePath.endsWith('.js')) {
    return 'javascript'
  }

  if (filePath.endsWith('.jsx')) {
    return 'javascript-react'
  }

  if (filePath.endsWith('.cjs') || filePath.endsWith('.mjs')) {
    return 'javascript'
  }

  return 'other'
}

export function isPython(filePath: string): boolean {
  const language = getLanguage(filePath)
  return (
    language === 'python'
  )
}

export function isJavascriptish(filePath: string): boolean {
  const language = getLanguage(filePath)
  return (
    language === 'javascript'
    || language === 'typescript'
    || language === 'javascript-react'
    || language === 'typescript-react'
  )
}

export function isReact(filePath: string): boolean {
  const language = getLanguage(filePath)
  return (
    language === 'javascript-react'
    || language === 'typescript-react'
  )
}
