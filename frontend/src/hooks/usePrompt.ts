// Copyright © 2026 Jalapeno Labs

// Core
import { PromptContext } from '@frontend/gates/PromptGate'
import { useContext } from 'react'

export function usePrompt() {
  return useContext(PromptContext)
}
