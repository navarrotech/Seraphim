// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

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
}
