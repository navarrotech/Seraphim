// Copyright © 2025 Jalapeno Labs

// Core
import { createSlice } from '@reduxjs/toolkit'

// Typescript
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ChromeLogPayload, VsCodeUserState, WsToServerMessage } from '@common/types'

export type DataState = {
  chromeLogsByPage: Record<string, ChromeLogPayload[]>
  activeVsCodeState: VsCodeUserState | null
}

const initialState: DataState = {
  chromeLogsByPage: {},
  activeVsCodeState: null
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
      if (state.activeVsCodeState?.workspaceName === action.payload) {
        state.activeVsCodeState = null
      }
    },
    resetData: () => ({
      ...initialState
    })
  }
})

export const dataActions = slice.actions
