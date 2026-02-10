// Copyright © 2026 Jalapeno Labs

import type { ControllerRenderProps } from 'react-hook-form'
import type { ReactNode } from 'react'
import type { WorkspaceFormValues } from './WorkspaceEditorForm'

// UI
import { Button } from '@heroui/react'
import { BuildLogsPanel } from '@frontend/common/BuildLogsPanel'
import { Monaco } from '@frontend/common/Monaco'
import { BaseDockerImageNotice } from '@frontend/common/workspaces/BaseDockerImageNotice'

// Utility
import { useApiBuildSocket } from '@frontend/hooks/useApiBuildSocket'

type Props = {
  value: string
  onChange: ControllerRenderProps<WorkspaceFormValues, 'customDockerfileCommands'>['onChange']
  isDisabled: boolean
  footer?: ReactNode
}

export function WorkspaceDockerBuildPanel(props: Props) {
  const {
    value,
    onChange,
    isDisabled,
    footer,
  } = props

  const buildSocket = useApiBuildSocket()

  function handleDockerfileCommandsChange(valueFromEditor: string | undefined) {
    if (valueFromEditor === undefined) {
      console.debug('WorkspaceDockerBuildPanel dockerfile editor returned undefined value')
      onChange('')
      return
    }

    onChange(valueFromEditor)
  }

  async function handleBuildImage() {
    await buildSocket.startBuild({
      customDockerfileCommands: value || '',
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
