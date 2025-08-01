// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot, ToolFactory, AgentOptions } from './types'
import type { Messages } from '@langchain/langgraph'
import type { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools'

// Core
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { getProjectConfig, validateConfig } from './utility/getProjectConfig'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { osToast } from '../main/notify'

// Redux
import { dispatch, getState } from '../lib/redux-store'
import { jobActions } from '../jobReducer'

// Misc
import { v7 as uuid } from 'uuid'
import { isEmpty } from 'lodash-es'
import { conjoiner } from './utility/conjoiner'
import { OPENAI_MED_MODEL } from '@common/constants'
import { appendLanguageInstructions } from './utility/appendLanguageInstructions'
import { Timer } from '@common/timer'

export async function executeAgent(
  messages: Messages = [],
  toolFactories: ToolFactory[],
  options: AgentOptions = {}
) {
  const jobId = uuid()
  const timer = new Timer('Job')

  try {
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

    if (options.shouldProceed) {
      const [ canProceed, errorMessage ] = options.shouldProceed(snapshot)
      if (!canProceed) {
        console.warn(`Graph execution aborted: ${errorMessage}`)
        return null
      }
    }

    const llm = new ChatOpenAI({
      apiKey: projectConfig.openAiApiToken,
      modelName: OPENAI_MED_MODEL
    })
    const embeddings = new OpenAIEmbeddings()

    const tools: (DynamicStructuredTool | DynamicTool)[] = []
    for (const tool of toolFactories) {
      const result = tool(snapshot, llm, embeddings)
      if (!result) {
        continue
      }
      tools.push(result)
    }

    dispatch(
      jobActions.addJob({
        id: jobId,
        controller: abortController
      })
    )

    const agent = createReactAgent({
      llm,
      tools
    })

    messages = appendLanguageInstructions(
      messages,
      snapshot,
      options.languageInstructions
    )

    if (snapshot.projectConfig.additionalContext) {
      messages.push({
        role: 'human',
        content: 'Additional project context from the user:\n' + snapshot.projectConfig.additionalContext
      })
    }

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
        const conjoined = conjoiner(agent.messages as any)
        if (conjoined) {
          console.log('🦜 From agent:', conjoined)
          osToast({
            title: 'Seraphim Agent',
            body: conjoined
          })
        }
        else {
          console.log('🦜 Agent response:', agent.messages)
        }
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
  finally {
    dispatch(
      jobActions.removeJob(jobId)
    )
    timer.stop()
  }

  return null
}
