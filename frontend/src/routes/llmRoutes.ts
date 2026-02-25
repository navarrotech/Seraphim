// Copyright © 2026 Jalapeno Labs

import type { Llm, LlmWithRateLimits } from '@common/types'
import type { CreateLlmRequest, UpdateLlmRequest } from '@common/schema/llm'

// Core
import { parseRequestBeforeSend } from '@common/api'
import { frontendClient } from '@frontend/framework/api'

// Redux
import { llmActions } from '@frontend/framework/redux/stores/llms'
import { dispatch } from '@frontend/framework/store'

// Schema
import { createLlmSchema, updateLlmSchema } from '@common/schema/llm'

// /////////////////////////////// //
//            List LLMs            //
// /////////////////////////////// //

type ListLlmsResponse = {
  llms: LlmWithRateLimits[]
}

// This route intentionally has no pagination
export async function listLlms() {
  const response = await frontendClient
    .get('v1/protected/llms')
    .json<ListLlmsResponse>()

  dispatch(
    llmActions.setLlms(response.llms),
  )

  return response
}

// /////////////////////////////// //
//           Create LLM            //
// /////////////////////////////// //

type CreateLlmResponse = {
  llm: LlmWithRateLimits
}

export async function createOpenAILlm(data: CreateLlmRequest) {
  const json = parseRequestBeforeSend(createLlmSchema, data)

  const response = await frontendClient
    .post('v1/protected/llms', { json })
    .json<CreateLlmResponse>()

  dispatch(
    llmActions.upsertLlm(response.llm),
  )

  return response
}

// /////////////////////////////// //
//           Update LLM            //
// /////////////////////////////// //

type UpdateLlmResponse = {
  llm: LlmWithRateLimits
}

export async function updateLlm(id: string, raw: UpdateLlmRequest) {
  const json = parseRequestBeforeSend(updateLlmSchema, raw)

  const response = await frontendClient
    .patch(`v1/protected/llms/${id}`, { json })
    .json<UpdateLlmResponse>()

  dispatch(
    llmActions.upsertLlm(response.llm),
  )

  return response
}

// /////////////////////////////// //
//           Delete LLM            //
// /////////////////////////////// //

type DeleteLlmRequest = Llm

export async function deleteLlm(llm: DeleteLlmRequest) {
  const response = await frontendClient
    .delete(`v1/protected/llms/${llm.id}`)

  dispatch(
    llmActions.removeLlm(llm),
  )

  return response
}
