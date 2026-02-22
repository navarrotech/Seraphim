// Copyright © 2026 Jalapeno Labs

import type { CodexAuthJson } from '@common/types'
import type { RateLimitWindow } from '@common/vendor/codex-protocol/v2/RateLimitWindow'
import type { RateLimitSnapshot } from '@common/vendor/codex-protocol/v2/RateLimitSnapshot'
import type { PlanType } from '@common/vendor/codex-protocol/PlanType'

// Core
import { CallableLLM } from './callLlm'
import { Codex } from '@openai/codex-sdk'

// Node.js
import { tmpdir } from 'node:os'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// Misc
import { Timer } from '@common/timer'

export class CallableCodex extends CallableLLM {
  private async getCodex(): Promise<[ Codex, string ]> {
    let contextDirectory: string | null = null

    contextDirectory = await mkdtemp(
      resolve(tmpdir(), 'seraphim-codex-'),
    )

    // In our database, we save the "auth.json" file as a string under the apiKey attribute
    await Promise.all([
      writeFile(
        resolve(contextDirectory, 'auth.json'),
        this.llm.apiKey,
        'utf-8',
      ),
      writeFile(
        resolve(contextDirectory, 'config.toml'),
        `cli_auth_credentials_store = "file"\n`,
        'utf-8',
      ),
    ])

    const client = new Codex({
      env: {
        CODEX_HOME: contextDirectory,
      },
    })

    return [ client, contextDirectory ]
  }

  private async teardownCodex(contextDirectory: string) {
    try {
      if (contextDirectory) {
        await rm(contextDirectory, { recursive: true, force: true })
      }
    }
    catch (error) {
      console.error('Failed to clean up Codex context directory', error)
    }
  }

  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('OpenAI query')

    let contextDirectory: string | null = null
    try {
      const [ client, contextDir ] = await this.getCodex()
      contextDirectory = contextDir

      let normalizedPrompt = ''
      if (systemPrompt) {
        normalizedPrompt += 'System prompt:\n' + systemPrompt.trim() + '\n\nUser prompt:\n'
      }
      normalizedPrompt += (prompt?.trim() || '')

      if (!normalizedPrompt) {
        console.debug('Codex query was empty after normalization')
        return 'Unnamed task'
      }

      console.debug('Sending query to Codex', { prompt: normalizedPrompt, systemPrompt })

      const thread = client.startThread()
      const result = await thread.run(normalizedPrompt)

      console.debug('Codex response', { response: result.finalResponse })

      return result.finalResponse
    }
    catch (error) {
      console.error('Error during Codex query', error)
    }
    finally {
      await this.teardownCodex(contextDirectory)
      timer.stop()
    }

    return 'Unnamed task'
  }

  public async getRateLimits(): Promise<RateLimitSnapshot | null> {
    try {
      const auth: CodexAuthJson = JSON.parse(this.llm.apiKey)

      if (!auth.tokens.access_token) {
        throw new Error('Missing codex access token in auth.json!')
      }

      type AccountStatus = {
        user_id?: string
        account_id?: string
        email?: string
        plan_type?: PlanType | null
        rate_limit?: {
          allowed?: boolean
          limit_reached?: boolean
          primary_window?: {
            used_percent?: number
            limit_window_seconds?: number
            reset_after_seconds?: number
            reset_at?: number
          } | null
          secondary_window?: {
            used_percent?: number
            limit_window_seconds?: number
            reset_after_seconds?: number
            reset_at?: number
          } | null
        } | null
        code_review_rate_limit?: {
          allowed?: boolean
          limit_reached?: boolean
          primary_window?: {
            used_percent?: number
            limit_window_seconds?: number
            reset_after_seconds?: number
            reset_at?: number
          } | null
          secondary_window?: {
            used_percent?: number
            limit_window_seconds?: number
            reset_after_seconds?: number
            reset_at?: number
          } | null
        } | null
        additional_rate_limits?: unknown
        credits?: {
          has_credits?: boolean
          unlimited?: boolean
          balance?: string | null
          approx_local_messages?: [number, number] | number[]
          approx_cloud_messages?: [number, number] | number[]
        } | null
        promo?: unknown
      }

      const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Seraphim',
          'Authorization': `Bearer ${auth.tokens.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch usage statistics: ${response.statusText}`)
      }

      const content: AccountStatus = await response.json()

      function toRateLimitWindow(window: AccountStatus['rate_limit']['primary_window']): RateLimitWindow | null {
        if (!window) {
          return null
        }

        return {
          usedPercent:
            typeof window.used_percent === 'number' && Number.isFinite(window.used_percent)
              ? window.used_percent
              : 0,
          windowDurationMins:
            typeof window.limit_window_seconds === 'number' && Number.isFinite(window.limit_window_seconds)
              ? Math.round(window.limit_window_seconds / 60)
              : null,
          resetsAt:
            typeof window.reset_at === 'number' && Number.isFinite(window.reset_at)
              ? window.reset_at
              : null, // preserve server epoch format as-is
        }
      }

      const rateLimits: RateLimitSnapshot = {
        primary: toRateLimitWindow(content.rate_limit?.primary_window),
        secondary: toRateLimitWindow(content.rate_limit?.secondary_window),
        credits: content.credits
          ? {
              hasCredits: Boolean(content.credits.has_credits),
              unlimited: Boolean(content.credits.unlimited),
              balance: content.credits.balance ?? null,
            }
          : null,
        planType: content.plan_type || 'unknown',
      }

      return rateLimits
    }
    catch (error) {
      console.error('Error during Codex rate limit request', error)
    }

    return null
  }
}
