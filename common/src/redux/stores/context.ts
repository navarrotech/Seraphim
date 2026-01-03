// Copyright © 2026 Jalapeno Labs

// Core
import { createEnhancedSlice } from '../createEnhancedSlice'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  ChromeLogPayload,
  VsCodeUserState,
  WsToServerMessage,
  SystemStatus,
} from '@common/types'

export type ContextState = {
  serverStatus: SystemStatus
  chromeLogsByPage: Record<string, ChromeLogPayload[]>
  activeVsCodeState: VsCodeUserState | null
  vsCodeConnectionsByWorkspace: Record<string, VsCodeUserState>
}

const initialState: ContextState = {
  serverStatus: 'offline',
  chromeLogsByPage: {},
  activeVsCodeState: null,
  vsCodeConnectionsByWorkspace: {},
} as const

export const slice = createEnhancedSlice({
  name: 'context',
  initialState,
  reducers: {
    addChromeLogs: (state, action: PayloadAction<WsToServerMessage<'chrome'>>) => {
      const { source, payload } = action.payload

      if (!state.chromeLogsByPage[source]) {
        state.chromeLogsByPage[source] = []
      }

      state.chromeLogsByPage[source].push(payload.log)
    },
    clearChromeLogsForSource: (state, action: PayloadAction<string>) => {
      delete state.chromeLogsByPage[action.payload]
    },
    setActiveVsCodeState: (state, action: PayloadAction<WsToServerMessage<'vscode'>>) => {
      const { payload } = action.payload

      state.vsCodeConnectionsByWorkspace[payload.workspaceName] = payload

      if (!payload.focusedFilePath) {
        return
      }

      if (!payload.userTextSelection?.length) {
        return
      }

      if (!payload.userTextSelection[0].text) {
        return
      }

      state.activeVsCodeState = payload
    },
    clearActiveVsCodeStateForSource: (state, action: PayloadAction<string>) => {
      delete state.vsCodeConnectionsByWorkspace[action.payload]
      if (state.activeVsCodeState?.workspaceName === action.payload) {
        state.activeVsCodeState = null
      }
    },
    setServerStatus: (state, action: PayloadAction<SystemStatus>) => {
      state.serverStatus = action.payload
    },
  },
})

export const contextActions = slice.actions
