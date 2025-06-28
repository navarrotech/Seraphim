// Copyright © 2025 Jalapeno Labs

/* eslint-disable no-console */

// Typescript
import type { LogLevel } from '@common/types'
import type { BridgedLogFunction } from '@common/types'

class Logger {
  private transport: BridgedLogFunction

  constructor() {
    if (!window.electron?.log) {
      console.warn('Electron log binding is not available.')
      this.transport = () => {
        // No-op transport if electron log is not available
      }
      return
    }

    this.transport = window.electron.log.bind(window.electron)
  }

  private call(level: LogLevel, ...msgs: unknown[]) {
    console[level](...msgs)
    this.transport(level, ...msgs)
  }

  public log(...msgs: unknown[]): void {
    this.call('log', ...msgs)
  }
  public warn(...msgs: unknown[]): void {
    this.call('warn', ...msgs)
  }
  public error(...msgs: unknown[]): void {
    this.call('error', ...msgs)
  }
  public info(...msgs: unknown[]): void {
    this.call('info', ...msgs)
  }
  public debug(...msgs: unknown[]): void {
    this.call('debug', ...msgs)
  }
}

window.logger = new Logger()

// Apply the global type!
declare global {
  interface Window {
    logger: Logger
  }
  const logger: Logger
}
