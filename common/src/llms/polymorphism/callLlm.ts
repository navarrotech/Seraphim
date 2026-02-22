// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'
import type { RateLimitSnapshot } from '@common/vendor/codex-protocol/v2/RateLimitSnapshot'

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

  public async getRateLimits(): Promise<RateLimitSnapshot | null> {
    // Placeholder implementation - replace with actual rate limit retrieval logic
    console.debug('CallableLLM getRateLimits has no provider implementation', {
      llmId: this.llm.id,
      llmType: this.llm.type,
    })
    return null
  }

  public async validateLlm(): Promise<[ boolean, string ]> {
    // Placeholder implementation - replace with actual validation logic
    console.debug('CallableLLM validateLlm has no provider implementation', {
      llmId: this.llm.id,
      llmType: this.llm.type,
    })
    return [ false, `Not implemented for this LLM type: ${this.llm.type}` ]
  }
}
