// Copyright © 2025 Jalapeno Labs

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// File lib
import { getSeraphimHomeDirectory } from '../../seraphim'
import { createHashForText } from '../../../../common/src/node/sha256'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

// Misc
import { PROMPT_CACHE_DIRNAME } from '@common/constants'

export async function loadCache(input: ChatCompletionMessageParam[]): Promise<string | null> {
  try {
    const cacheFile = promptToCacheFile(input)
    if (!cacheFile || !existsSync(cacheFile)) {
      return null
    }

    return await readFile(cacheFile, 'utf-8')
  }
  catch {
    return null
  }
}

export async function saveCache(input: ChatCompletionMessageParam[], output: string): Promise<void> {
  try {
    const cacheFile = promptToCacheFile(input)
    if (!cacheFile || !output) {
      return
    }

    await writeFile(cacheFile, output, 'utf-8')
  }
  catch (error) {
    console.error('Failed to save prompt to cache:', error)
  }
}

function promptToCacheFile(input: ChatCompletionMessageParam[]): string | null {
  if (!input || input.length === 0) {
    return null
  }

  let prompt = ''
  for (const message of input) {
    prompt += `${message.role}: ${message.content}\n`
  }

  const cacheKey = createHashForText(prompt)
  const cacheFile = getSeraphimHomeDirectory(
    PROMPT_CACHE_DIRNAME,
    `${cacheKey}.json`
  )

  return cacheFile
}
