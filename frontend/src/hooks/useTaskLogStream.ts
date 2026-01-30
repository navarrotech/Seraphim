// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect, useRef, useState } from 'react'

type LogSource = 'stdout' | 'stderr'

export type TaskLogEntry = {
  id: number
  source: LogSource
  line: string
}

export function useTaskLogStream(taskId?: string) {
  const [ logs, setLogs ] = useState<TaskLogEntry[]>([])
  const nextLogId = useRef(1)

  useEffect(() => {
    if (!taskId) {
      console.debug('useTaskLogStream missing taskId')
      setLogs([])
      return undefined
    }

    setLogs([])
    nextLogId.current = 1

    const url = `/api/v1/protected/tasks/${taskId}/logs/stream`
    const eventSource = new EventSource(url)

    function appendLog(source: LogSource, line: string) {
      const entry: TaskLogEntry = {
        id: nextLogId.current,
        source,
        line,
      }

      nextLogId.current += 1
      setLogs((previousLogs) => [ ...previousLogs, entry ])
    }

    function handleStdout(event: MessageEvent<string>) {
      appendLog('stdout', event.data)
    }

    function handleStderr(event: MessageEvent<string>) {
      appendLog('stderr', event.data)
    }

    function handleError(event: Event) {
      console.debug('Task log SSE error', { taskId, event })
    }

    eventSource.addEventListener('task-stdout', handleStdout)
    eventSource.addEventListener('task-stderr', handleStderr)
    eventSource.addEventListener('error', handleError)

    return function cleanup() {
      eventSource.removeEventListener('task-stdout', handleStdout)
      eventSource.removeEventListener('task-stderr', handleStderr)
      eventSource.removeEventListener('error', handleError)
      eventSource.close()
    }
  }, [ taskId ])

  return logs
}
