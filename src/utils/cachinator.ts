// Copyright © 2025 Jalapeno Labs

// Typescript
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Core
import { createHash } from 'crypto'
import { PROMPT_CACHE_DIR } from '@/constants'

// File lib
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'

export async function loadCache(
  input: ChatCompletionMessageParam[]
): Promise<string | null> {
  // Make sure the cache directory exists
  mkdir(PROMPT_CACHE_DIR, { recursive: true })

  if (!input || input.length === 0) {
    return null
  }

  const prompt = combineMessagesIntoPrompt(input)
  const cacheKey = promptToCacheKey(prompt)

  const cacheFile = resolve(
    join(PROMPT_CACHE_DIR, `${cacheKey}.json`)
  )

  if (!existsSync(cacheFile)) {
    return null
  }

  try {
    return await readFile(cacheFile, 'utf-8')
  }
  catch {
    return null
  }
}

export async function saveCache(
  input: ChatCompletionMessageParam[],
  output: string
): Promise<void> {
  // Make sure the cache directory exists
  mkdir(PROMPT_CACHE_DIR, { recursive: true })

  const prompt = combineMessagesIntoPrompt(input)
  const cacheKey = promptToCacheKey(prompt)

  const cacheFile = resolve(
    join(PROMPT_CACHE_DIR, `${cacheKey}.json`)
  )

  if (!output) {
    console.warn('[CACHINATOR]: No output to save, skipping cache write.')
    return
  }

  await writeFile(cacheFile, output, 'utf-8')
}

function combineMessagesIntoPrompt(
  messages: ChatCompletionMessageParam[]
): string {
  let prompt = ''
  for (const message of messages) {
    prompt += `${message.role}: ${message.content}\n`
  }
  return prompt
}

/**
 * Generate a SHA-256 digest by streaming text in chunks
 *
 * @param {string} prompt – the full text to hash
 * @return {string} a Promise resolving to a hex-encoded SHA-256 digest
 */
function promptToCacheKey(prompt: string): string {
  const hash = createHash('sha256')

  // split into, say, 1 MB chunks to keep memory bounded
  const CHUNK_SIZE = 1024 * 1024
  for (let offset = 0; offset < prompt.length; offset += CHUNK_SIZE) {
    const chunk = prompt.slice(offset, offset + CHUNK_SIZE)
    hash.update(chunk, 'utf8')
  }

  return hash.digest('hex')
}
