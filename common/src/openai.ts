// Copyright © 2025 Jalapeno Labs

// Core
import { OpenAI } from 'openai'
import { safeParseJson, safeStringifyJson } from './json'

// Utility
import { loadCache, saveCache } from './cachinator'

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
