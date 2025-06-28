// Copyright © 2025 Jalapeno Labs

// Core
import { createSlice } from '@reduxjs/toolkit'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  ChromeLogPayload,
  VsCodeUserState,
  WsToServerMessage,
  SystemStatus
} from '@common/types'

export type DataState = {
  errors: Set<string>
  warnings: Set<string>
  serverStatus: SystemStatus
  chromeLogsByPage: Record<string, ChromeLogPayload[]>
  activeVsCodeState: VsCodeUserState | null
  vsCodeConnectionsByWorkspace: Record<string, VsCodeUserState>
}

const initialState: DataState = {
  errors: new Set(),
  warnings: new Set(),
  serverStatus: 'offline',
  chromeLogsByPage: {},
  activeVsCodeState: null,
  vsCodeConnectionsByWorkspace: {}
} as const

export const slice = createSlice({
  name: 'data',
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

      if (!payload.userTextSelection[0].length) {
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
    pushError: (state, action: PayloadAction<string>) => {
      state.errors.add(action.payload)
    },
    pushWarning: (state, action: PayloadAction<string>) => {
      state.warnings.add(action.payload)
    },
    resetData: () => ({
      ...initialState
    })
  }
})

export const dataActions = slice.actions
