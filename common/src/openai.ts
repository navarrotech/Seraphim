// Copyright © 2026 Jalapeno Labs

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Core
import { OpenAI } from 'openai'
import { safeParseJson, safeStringifyJson } from './json'

// File lib
import { getSeraphimWorkingDirectory } from './seraphim'
import { createHashForText } from './node/sha256'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

// Misc
import { PROMPT_CACHE_DIRNAME } from '@common/constants'

// THIS FILE IS TO BE DEPRECATED, IN FAVOR OF LANGGRAPH

// This requires the OPENAI_API_KEY environment variable to be set
export const openai = new OpenAI()

// We override the chat completions create method to add caching functionality

const originalCreate = openai.chat.completions.create.bind(openai.chat.completions)

// @ts-ignore
openai.chat.completions.create = async (body, options) => {
  const cachedResponse = await loadCache(body.messages)
  if (cachedResponse) {
    console.log('[CACHE]: Cache hit for prompt')
    return safeParseJson(cachedResponse, null, 2)
  }

  const response = await originalCreate(body, options)

  await saveCache(body.messages, safeStringifyJson(response))

  return response
}

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
  const cacheFile = getSeraphimWorkingDirectory(
    PROMPT_CACHE_DIRNAME,
    `${cacheKey}.json`,
  )

  return cacheFile
}
