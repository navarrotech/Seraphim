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

// ////////////////////////// //
//        Other types         //
// ////////////////////////// //

export type CodexAuthJson = {
  OPENAI_API_KEY?: string | null,
  tokens: {
    id_token?: string
    access_token?: string
    refresh_token?: string
    account_id?: string
  },
  last_refresh?: string,
}

export type FileFilter = {
  name: string
  // This does NOT include dots
  // e.g. ['txt', 'js'] not ['.txt', '.js']
  extensions: string[]
}

export type OpenDialogOptions = {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: FileFilter[]
  properties?: Array<
    'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >
}

export type CommandResponse = {
  successful: boolean
  errors?: string[]
}
