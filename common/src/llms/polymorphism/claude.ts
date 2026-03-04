// Copyright © 2026 Jalapeno Labs

// Core
import { BaseCallableLLM } from './base'

// Misc
import { Timer } from '@common/timer'

type ClaudeResponseBlock = {
  type?: string
  text?: string
}

type ClaudeMessagesResponse = {
  content?: ClaudeResponseBlock[]
}

export class CallableClaude extends BaseCallableLLM {
  private readonly endpoint = 'https://api.anthropic.com/v1/messages'
  private readonly backupModel = 'claude-3-7-sonnet-latest'

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('Claude query')

    const input = prompt?.trim() || ''
    if (!input) {
      return null
    }

    if (!this.llm.apiKey) {
      console.debug('Claude query attempted without API key', { llmId: this.llm.id })
      return null
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.llm.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.llm.preferredModel || this.backupModel,
          max_tokens: 512,
          system: systemPrompt?.trim() || undefined,
          messages: [
            {
              role: 'user',
              content: input,
            },
          ],
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        console.debug('Claude query failed with non-ok response', {
          status: response.status,
          body,
        })
        return null
      }

      const payload = await response.json() as ClaudeMessagesResponse
      const contentBlocks = payload.content || []
      const text = contentBlocks
        .filter((block) => block.type === 'text' && Boolean(block.text?.trim()))
        .map((block) => block.text?.trim())
        .join('\n')
        .trim()

      return text || null
    }
    catch (error) {
      console.error('Error during Claude query', error)
      return null
    }
    finally {
      timer.stop()
    }
  }

  public async validateLlm(): Promise<[ boolean, string ]> {
    if (!this.llm.apiKey) {
      return [ false, 'No api key provided' ]
    }

    const response = await this.query('What is 2 + 2?')
    if (response?.length && typeof response === 'string') {
      return [ true, '' ]
    }

    return [ false, 'Claude API key authentication failed' ]
  }
}
