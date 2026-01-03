// Copyright © 2026 Jalapeno Labs

import type { SeraphimProjectConfiguration } from '@common/types'
import type { RootState } from '../lib/redux-store'
import type { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import type { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools'

export type ContextSnapshot = {
  jobId: string
  projectConfig: SeraphimProjectConfiguration
  projectConfigPath: string
  state: RootState
}

export type ToolFactory = (
  snapshot: Readonly<ContextSnapshot>,
  llm: ChatOpenAI,
  embeddings: OpenAIEmbeddings
) => DynamicStructuredTool | DynamicTool

export type LanguageSpecificInstructions = {
  python?: string
  typescript?: string
  react?: string
}

export type AgentOptions = {
  languageInstructions?: LanguageSpecificInstructions
  shouldProceed?: (snapshot: Readonly<ContextSnapshot>) => [ boolean, string ]
}
