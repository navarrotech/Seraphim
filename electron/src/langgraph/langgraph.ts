// Copyright © 2025 Jalapeno Labs

import type { ChatModel } from 'openai/resources'

// Core
import { ChatOpenAI } from '@langchain/openai'
import { SeraphimProjectConfiguration } from '@common/types'

const model: ChatModel = 'o4-mini'

export function getLanggraphLLM(config: SeraphimProjectConfiguration) {
  const llm = new ChatOpenAI({
    apiKey: config.openAiApiToken,
    modelName: model
  })

  return llm
}
