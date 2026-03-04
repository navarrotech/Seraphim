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
  private latestQueryErrorMessage: string | null = null

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('Claude query')
    this.latestQueryErrorMessage = null

    const input = prompt?.trim() || ''
    if (!input) {
      this.latestQueryErrorMessage = 'Prompt is empty'
      return null
    }

    if (!this.llm.apiKey) {
      console.debug('Claude query attempted without API key', { llmId: this.llm.id })
      this.latestQueryErrorMessage = 'No api key provided'
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
        const normalizedBody = body?.trim() || 'No response body'
        this.latestQueryErrorMessage = `Anthropic API returned ${response.status}: ${normalizedBody}`
        console.error('Claude query failed with non-ok response', {
          status: response.status,
          body: normalizedBody,
          llmId: this.llm.id,
          preferredModel: this.llm.preferredModel || this.backupModel,
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

      if (!text) {
        this.latestQueryErrorMessage = 'Anthropic response did not include text content'
      }

      return text || null
    }
    catch (error) {
      this.latestQueryErrorMessage = error instanceof Error
        ? error.message
        : String(error)
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

    const errorDetail = this.latestQueryErrorMessage
      ? `: ${this.latestQueryErrorMessage}`
      : ''
    return [ false, `Claude API key authentication failed${errorDetail}` ]
  }
}
