// Copyright © 2026 Jalapeno Labs

import type {
  AuthAccount,
  Llm,
  Message,
  Task,
  User,
  Workspace,
  WorkspaceEnv,
} from '@prisma/client'

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
//         Prisma Ext         //
// ////////////////////////// //

export type WorkspaceWithEnv = Workspace & {
  envEntries: WorkspaceEnv[]
}

export type TaskWithFullContext = Task & {
  llm: Llm
  authAccount: AuthAccount
  messages: Message[]
  user: User
  workspace: WorkspaceWithEnv
}

export type LlmRecord = Llm & {
  preferredModel?: string | null
}
