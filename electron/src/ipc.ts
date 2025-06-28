// Copyright © 2025 Jalapeno Labs

import type { WebFrameMain } from 'electron'

// Why we do this:
// https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages

export function validateIpc(frame: WebFrameMain) {
  // Value the host of the URL using an actual URL parser and an allowlist
  return new URL(frame.url).host === 'electronjs.org'
}
