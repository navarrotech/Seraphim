// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

// Core
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Misc
import { LlmType } from '@prisma/client'
import { CallableDeepSeek } from './deepseek'

type Context = {
  debugMock: ReturnType<typeof vi.spyOn>
  errorMock: ReturnType<typeof vi.spyOn>
}

function hasRequiredEnvValues() {
  return Boolean(process.env.VITEST_DEEPSEEK_API_KEY)
}

function buildLlm(overrides: Partial<Llm> = {}): Llm {
  return {
    id: 'deepseek-test-llm',
    userId: 'deepseek-test-user',
    type: LlmType.DEEPSEEK_API_KEY,
    name: 'DeepSeek Test LLM',
    isDefault: false,
    preferredModel: process.env.VITEST_DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.VITEST_DEEPSEEK_API_KEY || null,
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

describe('CallableDeepSeek', () => {
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
    const callable = new CallableDeepSeek(
      buildLlm({
        id: 'deepseek-missing-key',
        apiKey: null,
      }),
    )

    const [ success, errorMessage ] = await callable.validateLlm()
    expect(success).toBe(false)
    expect(errorMessage).toContain('No api key provided')
  })

  it.skipIf(invalidEnvironment)('validateLlm accepts valid DeepSeek credentials', async () => {
    const callable = new CallableDeepSeek(buildLlm())
    const [ success, errorMessage ] = await callable.validateLlm()

    expect(success, errorMessage).toBe(true)
  })

  it.skipIf(invalidEnvironment)('validateLlm rejects bad DeepSeek API keys', async () => {
    const callable = new CallableDeepSeek(
      buildLlm({
        id: 'deepseek-invalid-key',
        apiKey: 'invalid-deepseek-key',
      }),
    )
    const [ success, errorMessage ] = await callable.validateLlm()

    expect(success).toBe(false)
    expect(errorMessage.toLowerCase()).toContain('failed')
  })
})
