// Copyright © 2026 Jalapeno Labs

// Core
import { BaseCallableLLM } from './base'

// Misc
import { Timer } from '@common/timer'

type DeepSeekMessage = {
  role: 'system' | 'user'
  content: string
}

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class CallableDeepSeek extends BaseCallableLLM {
  private readonly endpoint = 'https://api.deepseek.com/chat/completions'
  private readonly backupModel = 'deepseek-chat'
  private latestQueryErrorMessage: string | null = null

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('DeepSeek query')
    this.latestQueryErrorMessage = null

    const input = prompt?.trim() || ''
    if (!input) {
      this.latestQueryErrorMessage = 'Prompt is empty'
      return null
    }

    if (!this.llm.apiKey) {
      console.debug('DeepSeek query attempted without API key', { llmId: this.llm.id })
      this.latestQueryErrorMessage = 'No api key provided'
      return null
    }

    const messages: DeepSeekMessage[] = []
    const instructions = systemPrompt?.trim()
    if (instructions) {
      messages.push({ role: 'system', content: instructions })
    }

    messages.push({ role: 'user', content: input })

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.llm.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.llm.preferredModel || this.backupModel,
          messages,
          stream: false,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        const normalizedBody = body?.trim() || 'No response body'
        this.latestQueryErrorMessage = `DeepSeek API returned ${response.status}: ${normalizedBody}`
        console.error('DeepSeek query failed with non-ok response', {
          status: response.status,
          body: normalizedBody,
          llmId: this.llm.id,
          preferredModel: this.llm.preferredModel || this.backupModel,
        })
        return null
      }

      const payload = await response.json() as DeepSeekChatResponse
      const content = payload.choices?.[0]?.message?.content?.trim()

      if (!content) {
        this.latestQueryErrorMessage = 'DeepSeek response did not include text content'
      }

      return content || null
    }
    catch (error) {
      this.latestQueryErrorMessage = error instanceof Error
        ? error.message
        : String(error)
      console.error('Error during DeepSeek query', error)
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
    return [ false, `DeepSeek API key authentication failed${errorDetail}` ]
  }
}
