// Copyright © 2026 Jalapeno Labs

// Misc
import { sseManager } from './sseManager'

export type SseChangeType = 'create' | 'update' | 'delete'
export type SseChangeKind = 'accounts' | 'workspaces' | 'tasks'

export type SseChangePayload<Shape> = {
  type: SseChangeType
  kind: SseChangeKind
  data: Shape[]
}

export function broadcastSseChange<Shape>(payload: SseChangePayload<Shape>): void {
  try {
    const serializedPayload = JSON.stringify(payload)
    sseManager.broadcastEvent(payload.type, serializedPayload)
  }
  catch (error) {
    console.debug('Failed to serialize SSE payload', {
      kind: payload.kind,
      type: payload.type,
    })
    console.error(error)
  }
}
