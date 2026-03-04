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

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('DeepSeek query')

    const input = prompt?.trim() || ''
    if (!input) {
      return null
    }

    if (!this.llm.apiKey) {
      console.debug('DeepSeek query attempted without API key', { llmId: this.llm.id })
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
        console.debug('DeepSeek query failed with non-ok response', {
          status: response.status,
          body,
        })
        return null
      }

      const payload = await response.json() as DeepSeekChatResponse
      const content = payload.choices?.[0]?.message?.content?.trim()

      return content || null
    }
    catch (error) {
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

    return [ false, 'DeepSeek API key authentication failed' ]
  }
}
