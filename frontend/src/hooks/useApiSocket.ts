// Copyright © 2026 Jalapeno Labs

import type { SseChangePayload, SseChangeKind, SseChangeType } from '@common/types'

// Core
import { useEffect } from 'react'
import chalk from 'chalk'

// Redux
import { dispatch } from '@frontend/framework/store'
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { llmActions } from '@frontend/framework/redux/stores/llms'
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { taskActions } from '@frontend/framework/redux/stores/tasks'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'

// Misc
import { safeParseJson } from '@common/json'
import { getApiRoot } from '../lib/api'

type SseDataByKind = {
  [Kind in SseChangeKind]: SseChangePayload<Kind>['data']
}

type ActionCreatorFor<Kind extends SseChangeKind> = (data: SseDataByKind[Kind]) => any

type SseActionMap = {
  [Type in SseChangeType]: {
    [Kind in SseChangeKind]: readonly ActionCreatorFor<Kind>[]
  }
}
type AnySseChangePayload = {
  [Kind in SseChangeKind]: SseChangePayload<Kind>
}[SseChangeKind]

const actions: SseActionMap = {
  create: {
    tasks: [ taskActions.upsertTask ],
    settings: [ settingsActions.setSettings ],
    accounts: [ accountActions.upsertAccount ],
    llms: [ llmActions.upsertLlm ],
    workspaces: [ workspaceActions.upsertWorkspace ],
    usage: [ taskActions.upsertTaskUsage, llmActions.setLlmRateLimits ],
  },
  update: {
    tasks: [ taskActions.upsertTask ],
    settings: [ settingsActions.setSettings ],
    accounts: [ accountActions.upsertAccount ],
    llms: [ llmActions.upsertLlm ],
    workspaces: [ workspaceActions.upsertWorkspace ],
    usage: [ taskActions.upsertTaskUsage, llmActions.setLlmRateLimits ],
  },
  delete: {
    tasks: [ taskActions.removeTask ],
    settings: [],
    accounts: [ accountActions.removeAccount ],
    llms: [ llmActions.removeLlm ],
    workspaces: [ workspaceActions.removeWorkspace ],
    usage: [ taskActions.upsertTaskUsage, llmActions.setLlmRateLimits ],
  },
}

function dispatchPayload<Kind extends SseChangeKind>(payload: SseChangePayload<Kind>) {
  const targetActions = actions[payload.type][payload.kind]

  for (const action of targetActions) {
    dispatch(
      action(payload.data),
    )
  }
}

export function useApiSocket(): void {
  useEffect(function manageApiSocket() {
    const apiRoot = getApiRoot()
    const eventSource = new EventSource(`${apiRoot}/events`)

    function handleMessage(event: MessageEvent) {
      const payload: AnySseChangePayload = safeParseJson(event.data)
      if (!payload) {
        console.error(
          chalk.red('SSE event payload is not valid JSON'),
          event.data,
        )
        return
      }

      dispatchPayload(payload)
    }

    function handleError(event: Event) {
      console.debug('SSE error received', {
        event,
        readyState: eventSource.readyState,
      })
    }

    eventSource.addEventListener('message', handleMessage)
    eventSource.addEventListener('error', handleError)

    return function cleanupApiSocket() {
      eventSource.removeEventListener('message', handleMessage)
      eventSource.removeEventListener('error', handleError)
      eventSource.close()
    }
  }, [])
}
