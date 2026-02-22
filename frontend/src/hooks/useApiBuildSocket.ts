// Copyright © 2026 Jalapeno Labs

import type { BuildDockerImageRequest } from '@frontend/routes/dockerRoutes'

// Core
import { useCallback, useEffect, useMemo, useState } from 'react'

// Misc
import { getApiRoot } from '@common/api'
import { buildDockerImage } from '@frontend/routes/dockerRoutes'

type BuildStatus = 'success' | 'fail'

type BuildEventLog = {
  jobId: string
  message: string
}

type BuildEventFinished = {
  jobId: string
  status: BuildStatus
}

export type UseApiBuildSocketState = {
  jobId: string | null
  logs: string[]
  status: BuildStatus | null
  isBuilding: boolean
}

export type UseApiBuildSocket = UseApiBuildSocketState & {
  startBuild: (payload?: BuildDockerImageRequest) => Promise<void>
  resetBuild: () => void
}

export function useApiBuildSocket(): UseApiBuildSocket {
  const [ jobId, setJobId ] = useState<string | null>(null)
  const [ logs, setLogs ] = useState<string[]>([])
  const [ status, setStatus ] = useState<BuildStatus | null>(null)
  const [ isBuilding, setIsBuilding ] = useState(false)

  const apiRoot = useMemo(() => getApiRoot(), [])

  const resetBuild = useCallback(function resetBuild() {
    setJobId(null)
    setLogs([])
    setStatus(null)
    setIsBuilding(false)
  }, [])

  const startBuild = useCallback(async function startBuild(
    payload: BuildDockerImageRequest = {},
  ) {
    setLogs([])
    setStatus(null)
    setIsBuilding(true)

    try {
      const response = await buildDockerImage(payload)
      setJobId(response.jobId)
    }
    catch (error) {
      console.debug('useApiBuildSocket failed to start build', { error })
      setLogs([ 'Unable to start Docker build.' ])
      setStatus('fail')
      setIsBuilding(false)
    }
  }, [])

  useEffect(function manageBuildSocket() {
    if (!jobId) {
      return () => {}
    }

    const eventSource = new EventSource(
      `${apiRoot}/api/v1/protected/docker/build/events?jobId=${jobId}`,
    )

    function handleLog(event: MessageEvent) {
      let payload: BuildEventLog | null = null
      try {
        payload = JSON.parse(event.data) as BuildEventLog
      }
      catch (error) {
        console.debug('Build log event failed to parse', { error, data: event.data })
        return
      }

      if (!payload || payload.jobId !== jobId) {
        return
      }

      setLogs((previousLogs) => [ ...previousLogs, payload.message ])
    }

    function handleFinished(event: MessageEvent) {
      let payload: BuildEventFinished | null = null
      try {
        payload = JSON.parse(event.data) as BuildEventFinished
      }
      catch (error) {
        console.debug('Build finished event failed to parse', { error, data: event.data })
        return
      }

      if (!payload || payload.jobId !== jobId) {
        return
      }

      setStatus(payload.status)
      setIsBuilding(false)
      eventSource.close()
    }

    function handleError(event: Event) {
      console.debug('Build event source error', { event })
      setStatus('fail')
      setIsBuilding(false)
      eventSource.close()
    }

    eventSource.addEventListener('log', handleLog)
    eventSource.addEventListener('finished', handleFinished)
    eventSource.addEventListener('error', handleError)

    return function cleanupBuildSocket() {
      eventSource.removeEventListener('log', handleLog)
      eventSource.removeEventListener('finished', handleFinished)
      eventSource.removeEventListener('error', handleError)
      eventSource.close()
    }
  }, [ apiRoot, jobId ])

  return {
    jobId,
    logs,
    status,
    isBuilding,
    startBuild,
    resetBuild,
  }
}
