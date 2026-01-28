// Copyright © 2026 Jalapeno Labs

import type { UseApiBuildSocket } from '@frontend/hooks/useApiBuildSocket'

// Core
import { useEffect, useRef, useState } from 'react'

// User interface
import { Chip } from '@heroui/react'

type Props = {
  buildSocket: UseApiBuildSocket
  className?: string
}

export function BuildLogsPanel(props: Props) {
  const { buildSocket, className } = props
  const logsContainerRef = useRef<HTMLDivElement | null>(null)
  const [ shouldAutoScroll, setShouldAutoScroll ] = useState(true)

  useEffect(() => {
    setShouldAutoScroll(true)
  }, [ buildSocket.jobId ])

  useEffect(() => {
    if (!shouldAutoScroll) {
      return
    }

    const container = logsContainerRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [ shouldAutoScroll, buildSocket.logs.length, buildSocket.status ])

  return <div className={`relaxed ${className || ''}`}>
    <div className='compact level'>
      <div className='text-lg'>
        <strong>Build logs</strong>
      </div>
      <BuildStatusLabel
        status={buildSocket.status}
        isBuilding={buildSocket.isBuilding}
      />
    </div>
    <div
      ref={logsContainerRef}
      className='max-h-96 overflow-y-auto rounded-md bg-black p-3 text-white/80'
      onScroll={() => {
        const container = logsContainerRef.current
        if (!container) {
          return
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight

        setShouldAutoScroll(
          distanceFromBottom < 16,
        )
    }}
    >
      {buildSocket.logs.length > 0
        ? <pre className='text-xs opacity-80 whitespace-pre-wrap'>
            {buildSocket.logs.join('\n')}
          </pre>
        : <p className='opacity-80'>No build logs yet.</p>
      }
    </div>
  </div>
}

type BuildStatusProps = {
  status: UseApiBuildSocket['status']
  isBuilding: boolean
}

function BuildStatusLabel(props: BuildStatusProps) {
  if (props.isBuilding) {
    return <Chip variant='bordered' color='primary'>Building</Chip>
  }

  if (!props.status) {
    return <Chip variant='bordered' color='default'>Not built</Chip>
  }

  if (props.status === 'success') {
    return <Chip variant='bordered' color='success'>Build succeeded</Chip>
  }

  return <Chip variant='bordered' color='danger'>Build failed</Chip>
}
