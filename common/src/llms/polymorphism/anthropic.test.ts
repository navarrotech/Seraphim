// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

// Core
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Misc
import { LlmType } from '@prisma/client'
import { CallableClaude } from './claude'

type Context = {
  debugMock: ReturnType<typeof vi.spyOn>
  errorMock: ReturnType<typeof vi.spyOn>
}

function hasRequiredEnvValues() {
  return Boolean(process.env.VITEST_ANTHROPIC_API_KEY)
}

function buildLlm(overrides: Partial<Llm> = {}): Llm {
  return {
    id: 'anthropic-test-llm',
    userId: 'anthropic-test-user',
    type: LlmType.CLAUDE_API_KEY,
    name: 'Anthropic Test LLM',
    isDefault: false,
    preferredModel: process.env.VITEST_ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
    apiKey: process.env.VITEST_ANTHROPIC_API_KEY || null,
    refreshToken: null,
    expiresAt: null,
    tokensUsed: 0,
    tokenLimit: 0,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('CallableClaude (Anthropic)', () => {
  const invalidEnvironment = !hasRequiredEnvValues()

  beforeEach<Context>((context) => {
    context.debugMock = vi.spyOn(console, 'debug').mockImplementation(() => {})
    context.errorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach<Context>((context) => {
    context.debugMock.mockRestore()
    context.errorMock.mockRestore()
  })

  it('validateLlm returns a friendly error without an API key', async () => {
    const callable = new CallableClaude(
      buildLlm({
        id: 'anthropic-missing-key',
        apiKey: null,
      }),
    )

    const [ success, errorMessage ] = await callable.validateLlm()
    expect(success).toBe(false)
    expect(errorMessage).toContain('No api key provided')
  })

  it.skipIf(invalidEnvironment)('validateLlm accepts valid Anthropic credentials', async () => {
    const callable = new CallableClaude(buildLlm())
    const [ success, errorMessage ] = await callable.validateLlm()

    expect(success, errorMessage).toBe(true)
  })

  it.skipIf(invalidEnvironment)('validateLlm rejects bad Anthropic API keys', async () => {
    const callable = new CallableClaude(
      buildLlm({
        id: 'anthropic-invalid-key',
        apiKey: 'invalid-anthropic-key',
      }),
    )
    const [ success, errorMessage ] = await callable.validateLlm()

    expect(success).toBe(false)
    expect(errorMessage.toLowerCase()).toContain('failed')
  })
})
