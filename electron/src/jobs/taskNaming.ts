// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

// Utility
import { callLLM } from '@common/llms/call'

const systemPrompt = `Below the user will provide a request for a given task`
  + ` your job is to give it a clean and short & friendly PR name when the task is completed.`
  + ` Use 3-5 words when possible, and no more than 10 words.`
  + ` Return the task name only, no punctuation or quotes.`

export async function requestTaskName(
  llm: Llm,
  userMessage: string,
): Promise<string | null> {
  const result = await callLLM(
    llm,
    userMessage,
    systemPrompt,
  )

  return result
}

export function toContainerName(taskName: string) {
  const base = taskName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!base) {
    console.debug('Codex task name produced an empty container name', {
      taskName,
    })
    return 'seraphim-task'
  }

  const prefixed = `seraphim-${base}`
  if (prefixed.length <= 40) {
    return prefixed
  }

  return prefixed.slice(0, 40).replace(/-+$/g, '')
}
