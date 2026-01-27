// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect } from 'react'

// Lib
import { z } from 'zod'

// Redux
import { dispatch } from '@frontend/framework/store'
import { taskActions } from '@frontend/framework/redux/stores/tasks'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'

// Misc
import { getApiRoot } from '../lib/api'
import { listTasks } from '@frontend/lib/routes/taskRoutes'
import { listWorkspaces } from '@frontend/lib/routes/workspaceRoutes'

const ssePayloadSchema = z.object({
  type: z.enum([ 'create', 'update', 'delete' ]),
  kind: z.enum([ 'workspaces', 'tasks' ]),
})

function logSseEvent(eventType: string, event: MessageEvent): void {
  console.debug('SSE event received', {
    eventType,
    data: event.data,
    lastEventId: event.lastEventId,
    origin: event.origin,
  })
}

function handleMessage(event: MessageEvent) {
  logSseEvent('message', event)
}

function handleConnected(event: MessageEvent) {
  logSseEvent('connected', event)
}

async function refreshWorkspaces(): Promise<void> {
  try {
    const response = await listWorkspaces()

    dispatch(
      workspaceActions.setWorkspaces(response.workspaces),
    )
  }
  catch (error) {
    console.debug('SSE failed to refresh workspaces', { error })
  }
}

async function refreshTasks(): Promise<void> {
  try {
    const response = await listTasks()

    dispatch(
      taskActions.setTasks(response.tasks),
    )
  }
  catch (error) {
    console.debug('SSE failed to refresh tasks', { error })
  }
}

async function handleChange(eventType: string, event: MessageEvent) {
  logSseEvent(eventType, event)

  let payload: unknown
  try {
    payload = JSON.parse(event.data)
  }
  catch (error) {
    console.debug('SSE event payload is not valid JSON', {
      eventType,
      data: event.data,
    })
    return
  }

  const parsed = ssePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    console.debug('SSE event payload failed validation', {
      eventType,
      errors: parsed.error.flatten(),
    })
    return
  }

  if (parsed.data.kind === 'tasks') {
    await refreshTasks()
    return
  }

  if (parsed.data.kind === 'workspaces') {
    await refreshWorkspaces()
    return
  }

  console.debug('SSE event payload has unsupported kind', {
    eventType,
    kind: parsed.data.kind,
  })
}

function handleCreate(event: MessageEvent) {
  void handleChange('create', event)
}

function handleUpdate(event: MessageEvent) {
  void handleChange('update', event)
}

function handleDelete(event: MessageEvent) {
  void handleChange('delete', event)
}

export function useApiSocket(): void {
  useEffect(function manageApiSocket() {
    const apiRoot = getApiRoot()
    const eventSource = new EventSource(`${apiRoot}/events`)

    function handleError(event: Event) {
      console.debug('SSE error received', {
        event,
        readyState: eventSource.readyState,
      })
    }

    eventSource.addEventListener('message', handleMessage)
    eventSource.addEventListener('connected', handleConnected)
    eventSource.addEventListener('create', handleCreate)
    eventSource.addEventListener('update', handleUpdate)
    eventSource.addEventListener('delete', handleDelete)
    eventSource.addEventListener('error', handleError)

    return function cleanupApiSocket() {
      eventSource.removeEventListener('message', handleMessage)
      eventSource.removeEventListener('connected', handleConnected)
      eventSource.removeEventListener('create', handleCreate)
      eventSource.removeEventListener('update', handleUpdate)
      eventSource.removeEventListener('delete', handleDelete)
      eventSource.removeEventListener('error', handleError)
      eventSource.close()
    }
  }, [])
}
