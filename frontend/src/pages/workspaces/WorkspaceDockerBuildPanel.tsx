// Copyright © 2026 Jalapeno Labs

import type { ControllerRenderProps } from 'react-hook-form'
import type { ReactNode } from 'react'
import type { WorkspaceFormValues } from './WorkspaceEditorForm'

// Core
import { useEffect } from 'react'

// UI
import { Button } from '@heroui/react'
import { BuildLogsPanel } from '@frontend/common/BuildLogsPanel'
import { Monaco } from '@frontend/common/Monaco'
import { BaseDockerImageNotice } from '@frontend/common/workspaces/BaseDockerImageNotice'

// Utility
import { useApiBuildSocket } from '@frontend/hooks/useApiBuildSocket'

type Props = {
  workspaceName: string
  sourceRepoUrl: string
  setupScript: string
  postScript: string
  value: string
  onChange: ControllerRenderProps<WorkspaceFormValues, 'customDockerfileCommands'>['onChange']
  isDisabled: boolean
  onBuildStateChange?: (isBuilding: boolean) => void
  footer?: ReactNode
}

export function WorkspaceDockerBuildPanel(props: Props) {
  const {
    workspaceName,
    sourceRepoUrl,
    setupScript,
    postScript,
    value,
    onChange,
    isDisabled,
    onBuildStateChange,
    footer,
  } = props

  const buildSocket = useApiBuildSocket()

  useEffect(() => {
    if (!onBuildStateChange) {
      return
    }

    onBuildStateChange(buildSocket.isBuilding)
  }, [ buildSocket.isBuilding, onBuildStateChange ])

  function handleDockerfileCommandsChange(valueFromEditor: string | undefined) {
    if (valueFromEditor === undefined) {
      console.debug('WorkspaceDockerBuildPanel dockerfile editor returned undefined value')
      onChange('')
      return
    }

    onChange(valueFromEditor)
  }

  async function handleBuildImage() {
    const trimmedWorkspaceName = workspaceName.trim()
    if (!trimmedWorkspaceName) {
      console.debug('WorkspaceDockerBuildPanel cannot build image without workspace name', {
        workspaceName,
      })
      return
    }

    const trimmedSourceRepoUrl = sourceRepoUrl.trim()
    if (!trimmedSourceRepoUrl) {
      console.debug('WorkspaceDockerBuildPanel cannot build image without source repository URL', {
        sourceRepoUrl,
      })
      return
    }

    await buildSocket.startBuild({
      name: trimmedWorkspaceName,
      sourceRepoUrl: trimmedSourceRepoUrl,
      customDockerfileCommands: value || '',
      setupScript: setupScript || '',
      postScript: postScript || '',
    })
  }

  return <div className='level w-full items-start'>
    <div className='w-full'>
      <div className='relaxed w-full'>
        <label className='text-sm font-medium'>Custom Dockerfile commands</label>
        <BaseDockerImageNotice />
        <Monaco
          height='220px'
          fileLanguage='dockerfile'
          minimapOverride={false}
          value={value}
          onChange={handleDockerfileCommandsChange}
          readOnly={isDisabled}
        />
      </div>
      <Button
        type='button'
        color='primary'
        isLoading={buildSocket.isBuilding}
        isDisabled={isDisabled}
        onPress={handleBuildImage}
      >
        <span>Build Image</span>
      </Button>
      {footer}
    </div>
    <div className='w-full'>
      <BuildLogsPanel buildSocket={buildSocket} />
    </div>
  </div>
}
