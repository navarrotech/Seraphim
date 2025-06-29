// Copyright © 2025 Jalapeno Labs

import type { CompiledStateGraph } from '@langchain/langgraph'
import type { SeraphimProjectConfiguration } from '@common/types'

// Core
import { Annotation } from '@langchain/langgraph'
import { getProjectConfig } from './utility/getProjectConfig'

// Redux
import { dispatch } from '../lib/redux-store'
import { jobActions } from '../jobReducer'

// Misc
import { v7 as uuid } from 'uuid'

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

export const DeveloperContext = Annotation.Root({
  projectConfig: Annotation<SeraphimProjectConfiguration>,
  userTextSelection: Annotation<string[]>,
  userFocusedFile: Annotation<string>
  // chromeLogs: Annotation<ChromeLogPayload[]>,
  // dockerLogsByContainer: Annotation<Record<string, string[]>>,
})

export async function executeGraph(
  graph: CompiledStateGraph<any, any>
) {
  const jobId = uuid()
  const abortController = new AbortController()
  const [ projectConfig, rootPath ] = getProjectConfig()
}
