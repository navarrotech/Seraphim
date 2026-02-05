// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

// Utility
import { callCodex } from '@electron/codex/callCodex'

type TaskNamingContext = {
  message: string
  workspaceName: string
}

export async function requestTaskName(
  llm: Llm,
  context: TaskNamingContext,
): Promise<string | null> {
  const prompt = buildTaskNamePrompt(context)

  try {
    const result = await callCodex({
      llm,
      prompt,
      timeoutMs: 45_000,
    })

    const taskName = resolveTaskName(result.lastMessage)
    if (!taskName) {
      console.debug('Codex naming output was invalid', {
        stdout: result.stdout,
        stderr: result.stderr,
        lastMessage: result.lastMessage,
      })
      return null
    }

    return taskName
  }
  catch (error) {
    console.debug('Codex naming failed', { error })
    return null
  }
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

function buildTaskNamePrompt(context: TaskNamingContext) {
  const lines = [
    'Generate a short task name for this request.',
    'Use 3-5 words when possible, and no more than 10 words.',
    'Return the task name only, no punctuation or quotes.',
    '',
    `Workspace: ${context.workspaceName}`,
    `Request: ${context.message}`,
  ]

  return lines.join('\n')
}

function resolveTaskName(message: string): string | null {
  const trimmed = message.trim()
  if (!trimmed) {
    console.debug('Codex task name was empty')
    return null
  }

  const firstLine = trimmed.split(/\r?\n/)[0].trim()
  if (!firstLine) {
    console.debug('Codex task name first line was empty')
    return null
  }

  const words = firstLine.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) {
    console.debug('Codex task name had no words')
    return null
  }

  return words.slice(0, 10).join(' ')
}
