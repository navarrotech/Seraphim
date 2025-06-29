// Copyright © 2025 Jalapeno Labs

/* eslint-disable no-console */

// Typescript
import { stringify } from '@common/stringify'
import type { LogLevel } from '@common/types'

// ////////////////////////////
// Monkey-patch console methods
// ////////////////////////////

if (window.electron.log) {
  const methods: LogLevel[] = [ 'log', 'info', 'debug', 'warn', 'error' ]

  methods.forEach((level) => {
  // Keep a reference to the original
    const original = console[level] as (...args: unknown[]) => void

    console[level] = (...args: unknown[]) => {
    // Turn args into a single string
      const message = stringify(...args)

      window.electron.log(level, message)

      // Still log to the real console
      original.apply(console, args)
    }
  })

  window.addEventListener('error', (event) => {
    const message = stringify(event.error)
    window.electron.log('error', message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const message = stringify(event.reason)
    window.electron.log('error', message)
  })
}
else {
  console.warn('Electron log binding is not available. Console logging will not be sent to the main process.')
}
