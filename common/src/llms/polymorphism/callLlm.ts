// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'
import type { LlmUsage } from '@common/types'


export class CallableLLM {
  protected readonly llm: Llm

  constructor(llm: Llm) {
    this.llm = llm
  }

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    // Placeholder implementation - replace with actual LLM call logic
    console.debug('CallableLLM received prompt', { prompt, systemPrompt })
    return `Response to: ${prompt}`
  }

  public async getUsageStatistics(): Promise<LlmUsage> {
    // Placeholder implementation - replace with actual usage retrieval logic
    console.debug('Fetching usage statistics for LLM', { llmId: this.llm.id })
    return {
      llmId: this.llm.id,
      usage: {
        last: null,
        modelContextWindow: 0,
        total: {
          cachedInputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
        },
      },
      rateLimits: null,
    }
  }
}
