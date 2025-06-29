// Copyright © 2025 Jalapeno Labs

import type { SeraphimProjectConfiguration } from '@common/types'
import type { RootState } from '../lib/redux-store'
import type { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import type { DynamicStructuredTool } from '@langchain/core/tools'

export type ContextSnapshot = {
  jobId: string
  projectConfig: SeraphimProjectConfiguration
  projectConfigPath: string
  state: RootState
}

export type ToolFactory = (
  snapshot: ContextSnapshot,
  llm: ChatOpenAI,
  embeddings: OpenAIEmbeddings
) => DynamicStructuredTool<any>
