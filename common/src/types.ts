// Copyright © 2026 Jalapeno Labs

import type { ThunkAction, Action, Dispatch } from '@reduxjs/toolkit'
import type { AppStore, AppDispatch, AppGetState } from '../../frontend/src/framework/store'

// ////////////////////////// //
//        Common Basic        //
// ////////////////////////// //

export type DateISO = string
export type AbsoluteFilePath = string
export type Theme = 'light' | 'dark' | 'system'
export type LogLevel = 'info' | 'log' | 'warn' | 'error' | 'debug' | 'verbose' | 'silly'
export type SystemStatus = 'operational' | 'degraded' | 'failure' | 'offline'
export type UnsubscribeFunction = () => any
export type StandardFilePointer = string | string[]

// ////////////////////////// //
//            Redux           //
// ////////////////////////// //

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
