// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot, ToolFactory } from './types'
import type { Messages } from '@langchain/langgraph'
import type { DynamicStructuredTool } from '@langchain/core/tools'

// Core
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { getProjectConfig, validateConfig } from './utility/getProjectConfig'
import { createReactAgent } from '@langchain/langgraph/prebuilt'

// Redux
import { dispatch, getState } from '../lib/redux-store'
import { jobActions } from '../jobReducer'

// Misc
import { v7 as uuid } from 'uuid'
import { isEmpty } from 'lodash-es'
import { conjoiner } from './utility/conjoiner'
import { OPENAI_MED_MODEL } from '@common/constants'

// export type FunctionPointer = {
//   absolutePath: string
//   functionName: string
// }

// export type ActionContext = {
//   id: string
//   vscodeWorkspace: WorkspaceSource
//   chromeLogs: ChromeLogPayload[]
//   sourceFiles: Record<string, string>
//   sourceFilePaths: FunctionPointer[]
//   dockerLogsByContainer: Record<string, string[]>
//   config: SeraphimProjectConfiguration
//   startedAt: number
// }

export async function executeGraph(
  messages: Messages = [],
  toolFactories: ToolFactory[],
  shouldProceed: (snapshot: Readonly<ContextSnapshot>) => [ boolean, string ]
) {
  try {
    const jobId = uuid()
    const abortController = new AbortController()

    const state = getState()
    console.log(state.data)
    const [ projectConfig, projectConfigPath ] = getProjectConfig()

    validateConfig(projectConfig)

    console.log(projectConfig, projectConfigPath)

    const snapshot: Readonly<ContextSnapshot> = Object.freeze({
      jobId,
      projectConfig,
      projectConfigPath,
      state
    })

    const [ canProceed, errorMessage ] = shouldProceed(snapshot)
    if (!canProceed) {
      console.warn(`Graph execution aborted: ${errorMessage}`)
      return null
    }

    const llm = new ChatOpenAI({
      apiKey: projectConfig.openAiApiToken,
      modelName: OPENAI_MED_MODEL
    })
    const embeddings = new OpenAIEmbeddings()

    const tools: DynamicStructuredTool[] = []
    for (const tool of toolFactories) {
      const result = tool(snapshot, llm, embeddings)
      if (!result) {
        continue
      }
      tools.push(result)
    }

    dispatch(
      jobActions.setOpenAIToken({
        jobId,
        token: projectConfig.openAiApiToken
      })
    )

    const agent = createReactAgent({
      llm,
      tools
    })

    // const finalResult = await agent.invoke({ messages }, {
    //   signal: abortController.signal,
    //   debug: true
    // })

    const stream = await agent.stream({ messages }, {
      signal: abortController.signal,
      streamMode: 'updates',
      recursionLimit: 50,
      debug: true
    })

    const responses = []
    for await (const update of stream) {
      const { agent, tools, ...other } = update
      if (agent) {
        console.log('🦜 From agent:', conjoiner(agent.messages as any))
      }
      if (tools) {
        console.log('🔧 Tool response:', conjoiner(tools.messages as any))
      }
      if (!isEmpty(other)) {
        console.log('🦜 Other updates:', other)
      }
      responses.push(update.messages)
    }

    return responses
  }
  catch (error) {
    console.error(`Graph execution failed: ${error.message}`)
  }

  return null
}
