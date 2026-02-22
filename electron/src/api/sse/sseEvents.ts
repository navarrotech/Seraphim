// Copyright © 2026 Jalapeno Labs

import type { SseChangePayload, SseChangeKind } from '@common/types'

// Misc
import { sseManager } from './sseManager'

export function broadcastSseChange<Kind extends SseChangeKind>(payload: SseChangePayload<Kind>): void {
  try {
    const serializedPayload = JSON.stringify(payload)
    sseManager.broadcastEvent(
      payload.type,
      serializedPayload,
    )
  }
  catch (error) {
    console.debug('Failed to serialize SSE payload', payload)
    console.error(error)
  }
}
