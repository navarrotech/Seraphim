// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { ConnectionRecord } from '@frontend/lib/types/connectionTypes'
import type { Selection } from '@react-types/shared'

// Core
import { useEffect, useState } from 'react'

// Redux
import { useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Select, SelectItem, Textarea } from '@heroui/react'

type TaskDraft = {
  message: string
  workspaceId: string
  connectionId: string
}

type Props = {
  workspaces: Workspace[]
  defaultWorkspaceId?: string
  isSubmitting?: boolean
  onSubmit: (draft: TaskDraft) => Promise<void>
}

export function EmptyTaskView(props: Props) {
  const {
    workspaces,
    defaultWorkspaceId,
    isSubmitting = false,
    onSubmit,
  } = props

  const connections = useSelector((state) => state.connections.items)

  const [ message, setMessage ] = useState<string>('')
  const [ workspaceId, setWorkspaceId ] = useState<string>('')
  const [ connectionId, setConnectionId ] = useState<string>('')

  useEffect(() => {
    if (defaultWorkspaceId) {
      setWorkspaceId(defaultWorkspaceId)
      return
    }

    if (workspaces.length > 0) {
      setWorkspaceId(workspaces[0].id)
      return
    }

    console.debug('EmptyTaskView has no workspaces to select from')
  }, [ defaultWorkspaceId, workspaces ])

  useEffect(() => {
    const defaultConnection = connections.find((connection) => connection.isDefault)
    if (defaultConnection) {
      setConnectionId(defaultConnection.id)
      return
    }

    if (connections.length > 0) {
      setConnectionId(connections[0].id)
      return
    }

    console.debug('EmptyTaskView has no connections to select from')
  }, [ connections ])

  function handleWorkspaceSelection(selection: Selection) {
    if (selection === 'all') {
      console.debug('EmptyTaskView received an unexpected workspace selection', {
        selection,
      })
      return
    }

    const selectedKeys = Array.from(selection)
    const selectedWorkspaceId = selectedKeys[0]

    if (!selectedWorkspaceId) {
      console.debug('EmptyTaskView failed to select a workspace', { selection })
      return
    }

    setWorkspaceId(String(selectedWorkspaceId))
  }

  function handleConnectionSelection(selection: Selection) {
    if (selection === 'all') {
      console.debug('EmptyTaskView received an unexpected connection selection', {
        selection,
      })
      return
    }

    const selectedKeys = Array.from(selection)
    const selectedConnectionId = selectedKeys[0]

    if (!selectedConnectionId) {
      console.debug('EmptyTaskView failed to select a connection', { selection })
      return
    }

    setConnectionId(String(selectedConnectionId))
  }

  async function handleSubmit() {
    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      console.debug('EmptyTaskView cannot submit without a message')
      return
    }

    if (!workspaceId) {
      console.debug('EmptyTaskView cannot submit without a workspace')
      return
    }

    if (!connectionId) {
      console.debug('EmptyTaskView cannot submit without a connection')
      return
    }

    await onSubmit({
      message: trimmedMessage,
      workspaceId,
      connectionId,
    })
  }

  const hasWorkspaces = workspaces.length > 0
  const hasConnections = connections.length > 0
  const isMessageEmpty = message.trim().length === 0
  const isSubmitDisabled = isSubmitting
    || !workspaceId
    || !connectionId
    || isMessageEmpty

  return <div className='flex h-full items-center justify-center p-10'>
    <Card className='w-full max-w-3xl p-8'>
      <div className='relaxed text-center'>
        <h2 className='text-2xl'>
          <strong>Start a new task</strong>
        </h2>
        <p className='opacity-80'>
          Share a first message to spin up a task and pick a workspace for it.
        </p>
      </div>
      <div className='relaxed'>
        <Textarea
          label='First message'
          placeholder='What should we build or explore?'
          minRows={6}
          autoFocus
          value={message}
          onValueChange={setMessage}
          isDisabled={isSubmitting}
        />
      </div>
      <div className='relaxed'>
        <Select
          label='Workspace'
          placeholder='Select a workspace'
          selectedKeys={workspaceId ? [ workspaceId ] : []}
          onSelectionChange={handleWorkspaceSelection}
          isDisabled={!hasWorkspaces || isSubmitting}
        >
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className='relaxed'>
        <Select
          label='Connection'
          placeholder='Select a connection'
          selectedKeys={connectionId ? [ connectionId ] : []}
          onSelectionChange={handleConnectionSelection}
          isDisabled={!hasConnections || isSubmitting}
        >
          {connections.map((connection) => (
            <SelectItem key={connection.id}>
              {getConnectionLabel(connection)}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className='level-right'>
        <Button
          color='primary'
          onPress={handleSubmit}
          isLoading={isSubmitting}
          isDisabled={isSubmitDisabled}
        >
          <span>Send First Message</span>
        </Button>
      </div>
    </Card>
  </div>
}

function getConnectionLabel(connection: ConnectionRecord) {
  if (connection.name) {
    return connection.name
  }

  if (connection.type === 'OPENAI_API_KEY') {
    return 'OpenAI (API key)'
  }

  if (connection.type === 'OPENAI_LOGIN_TOKEN') {
    return 'OpenAI (Login token)'
  }

  if (connection.type === 'KIMI_API_KEY') {
    return 'Kimi K2 (API key)'
  }

  console.debug('EmptyTaskView received an unsupported connection type', {
    connectionType: connection.type,
  })

  return connection.type
}
