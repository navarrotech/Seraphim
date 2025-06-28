// Copyright © 2025 Jalapeno Labs

import type { WebFrameMain } from 'electron'
import { isProduction } from '../env'
import logger from 'electron-log'

// Why we do this:
// https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages

export function validateIpc(frame: WebFrameMain) {
  const url = new URL(frame.url)
  let isValid: boolean = false
  if (!isProduction) {
    isValid = url.host === 'localhost:5173'
  }
  // In production, only allow requests from the main app
  isValid = isValid || (url.hostname === 'electron' && url.protocol === 'app:')

  if (!isValid) {
    logger.warn(
      `Blocked invalid IPC request from ${url.host}.`
    )
  }

  return isValid
}
