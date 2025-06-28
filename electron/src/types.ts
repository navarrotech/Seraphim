// Copyright © 2025 Jalapeno Labs

export type IpcLogEvent = {
  from: 'main' | 'renderer'
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  message: string
}
