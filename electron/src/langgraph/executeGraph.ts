// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot, ToolFactory } from './types'
import type { Messages } from '@langchain/langgraph'

// Core
import { ChatOpenAI } from '@langchain/openai'
import { getProjectConfig, validateConfig } from './utility/getProjectConfig'
import { createReactAgent } from '@langchain/langgraph/prebuilt'

// Redux
import { dispatch, getState } from '../lib/redux-store'
import { jobActions } from '../jobReducer'

// Misc
import { v7 as uuid } from 'uuid'
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

    const tools = toolFactories.map((factory) => factory(snapshot, llm))

    // dispatch(
    //   jobActions.setOpenAIToken({
    //     jobId,
    //     token: projectConfig.openAiApiToken
    //   })
    // )

    const agent = createReactAgent({
      llm,
      tools
    })

    return agent.invoke({ messages }, {
    //   signal: abortController.signal
    })
  }
  catch (error) {
    console.error(`Graph execution failed: ${error.message}`)
  }
}
