// Copyright © 2026 Jalapeno Labs

import type { ThunkAction, Action, Dispatch } from '@reduxjs/toolkit'
import type { AppStore, AppDispatch, AppGetState } from './redux/store'

// ////////////////////////// //
//        Common Basic        //
// ////////////////////////// //

export type DateISO = string
export type AbsoluteFilePath = string
export type Theme = 'light' | 'dark'
export type LogLevel = 'info' | 'log' | 'warn' | 'error' | 'debug' | 'verbose' | 'silly'
export type SystemStatus = 'operational' | 'degraded' | 'failure' | 'offline'
export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'typescript-react'
  | 'javascript-react'
  | 'python'
  | 'other'
export type UnsubscribeFunction = () => any

// ////////////////////////// //
//          Seraphim          //
// ////////////////////////// //

export type SeraphimProjectConfiguration = {
  openAiApiToken?: string
  additionalContext?: string
}

// ////////////////////////// //
//         Common Adv         //
// ////////////////////////// //

export type TextSelection = {
  startLine: number
  endLine: number
  text: string
}

export type Workspace = {
  name: string
  path: string
}

export type VsCodeUserState = {
  workspaceName: string
  workspacePaths: Workspace[]
  focusedFilePath: AbsoluteFilePath | undefined
  userTextSelection: TextSelection[]
  lastActiveTime: number
}

export type ChromeLogPayload = {
  timestamp: number
  type: LogLevel
  message: string
}

export type LanggraphJob = {
  id: string
  controller: AbortController
}

// ////////////////////////// //
//         WS Protocol        //
// ////////////////////////// //

export type WsSource =
  | 'chrome'
  | 'vscode'

export type WsToServerMessage<Source extends WsSource> = {
  id: string
  source: string
  timestamp: number
  payload: Source extends 'chrome'
    ? WsChromeLogReport
    : Source extends 'vscode'
    ? WsVscodeReport
    : never
}

export type WsChromeLogReport = {
  type: 'chrome-log-report'
  log: ChromeLogPayload
}

export type WsVscodeReport = {
  type: 'vscode-report'
} & VsCodeUserState

export type WsFromServerMessage = {
  id: string
  source: 'server'
  timestamp: number
  payload: WsTellVscodeToFocusFile
}

export type WsTellVscodeToFocusFile = {
  type: 'vscode-focus-file'
  filePath: AbsoluteFilePath
  lineNumber?: number
}

// ////////////////////////// //
//        Electron IPC        //
// ////////////////////////// //

export type BridgedLogFunction = (level: LogLevel, ...messages: any[]) => void

export type ElectronIpcBridge = {
  log: BridgedLogFunction
}
export type VersionIpcVersion = {
  node: string,
  chrome: string,
  electron: string
}

export type IpcLogEvent = {
  from: 'main' | 'renderer'
  level: LogLevel
  message: string
}

// Extend the window object with the types defined above
declare global {
  interface Window {
    electron: ElectronIpcBridge
    version: VersionIpcVersion
  }
}

export type ReduxState = ReturnType<AppGetState>

export type ReduxIpcBridge = {
  getState: () => ReduxState
  dispatch: Dispatch<Action>
  subscribe: (listener: (state: ReduxState) => void) => UnsubscribeFunction
}
export type Thunk = ThunkAction<void, ReduxState, unknown, Action>
export {
  AppDispatch,
  AppGetState,
  AppStore,
}
