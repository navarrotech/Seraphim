// Copyright © 2026 Jalapeno Labs

import type { Llm, LlmType } from '@prisma/client'

import { CallableLLM } from './polymorphism/callLlm'
import { CallableOpenAI } from './polymorphism/openai'
import { CallableCodex } from './polymorphism/codex'

const LlmTypeToCallableMap: Record<LlmType, new (llm: Llm) => CallableLLM> = {
  OPENAI_API_KEY: CallableOpenAI,
  OPENAI_LOGIN_TOKEN: CallableCodex,
}

export function getCallableLLM(llm: Llm): CallableLLM {
  const CallableClass = LlmTypeToCallableMap[llm.type]
  if (!CallableClass) {
    throw new Error(`Unsupported LLM type: ${llm.type}`)
  }

  const callable = new CallableClass(llm)

  return callable
}
