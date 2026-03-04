// Copyright © 2026 Jalapeno Labs

import type { Llm, LlmType } from '@prisma/client'

import { BaseCallableLLM } from './polymorphism/base'
import { CallableOpenAI } from './polymorphism/openai'
import { CallableCodex } from './polymorphism/codex'
import { CallableDeepSeek } from './polymorphism/deepseek'
import { CallableClaude } from './polymorphism/claude'

const LlmTypeToCallableMap: Record<LlmType, new (llm: Llm) => BaseCallableLLM> = {
  OPENAI_API_KEY: CallableOpenAI,
  OPENAI_LOGIN_TOKEN: CallableCodex,
  DEEPSEEK_API_KEY: CallableDeepSeek,
  CLAUDE_API_KEY: CallableClaude,
}

export function getCallableLLM(llm: Llm): BaseCallableLLM {
  const CallableClass = LlmTypeToCallableMap[llm.type]
  if (!CallableClass) {
    throw new Error(`Unsupported LLM type: ${llm.type}`)
  }

  const callable = new CallableClass(llm)

  return callable
}
