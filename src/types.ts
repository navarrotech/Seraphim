// Copyright © 2025 Jalapeno Labs

import { REGISTERED_ACTIONS } from './constants'

export type SeraphimProjectConfiguration = {
  monitorChrome?: boolean
  monitorTerminal?: boolean
  monitorVSCode?: boolean
  openAiApiToken?: string
  frontendUrl?: string
  dockerContainers?: string[]
}

export type ActionContext = {
  id: string
  vscodeWorkspace: WorkspaceSource
  chromeLogs: ChromeLogPayload[]
  sourceFiles: Record<string, string>
  sourceFilePaths: FunctionPointer[]
  dockerLogsByContainer: Record<string, string[]>
  config: SeraphimProjectConfiguration
  startedAt: number
}

export type FunctionPointer = {
  absolutePath: string
  functionName: string
}

export type LineReference = {
  sourceFilePath: string,
  importLine: string
}

export type RecommendedFix = {
  absolutePath: string
  fix: string
}

export type WorkspaceSource = {
  workspaceName: string
  vscodeExtensionUrl: string
  port: number
  absolutePath: string
  isFocused: boolean
  focusedFilePath?: string
  selectedText: string[]
}

export type ActionKeys = typeof REGISTERED_ACTIONS[number]

export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'typescript-react'
  | 'javascript-react'
  | 'python'
  | 'other'
