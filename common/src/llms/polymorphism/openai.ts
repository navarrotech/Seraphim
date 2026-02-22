// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'
import type { ResponsesModel } from 'openai/resources/shared'
import type { RateLimitSnapshot } from '@common/vendor/codex-protocol/v2/RateLimitSnapshot'

// Core
import { CallableLLM } from './callLlm'

// Lib
import OpenAI from 'openai'

// Misc
import { Timer } from '@common/timer'

export class CallableOpenAI extends CallableLLM {
  private client: OpenAI
  private backupModel: ResponsesModel = 'gpt-5.2'

  constructor(llm: Llm) {
    super(llm)

    this.client = new OpenAI({
      apiKey: llm.apiKey,
    })
  }

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('OpenAI query')

    console.debug('Calling OpenAI with prompt', { systemPrompt, prompt })

    const instructions = systemPrompt?.trim() || undefined
    const input = prompt?.trim() || ''
    if (!input) {
      return 'Unnamed task'
    }

    try {
      const response = await this.client.responses.create({
        model: this.llm.preferredModel || this.backupModel,
        instructions,
        input,
      })
      console.debug('OpenAI response', { response: response.output_text })

      return response.output_text ?? 'Unnamed task'
    }
    catch (error) {
      console.error('Error during OpenAI query', error)
    }
    finally {
      timer.stop()
    }

    return 'Unnamed task'
  }

  public async getRateLimits(): Promise<RateLimitSnapshot> {
    return {
      primary: {
        usedPercent: 0,
        windowDurationMins: null,
        resetsAt: null,
      },
      secondary: {
        usedPercent: 0,
        windowDurationMins: null,
        resetsAt: null,
      },
      credits: {
        hasCredits: true,
        unlimited: true,
        balance: null,
      },
      planType: 'unknown',
    }
  }
}
