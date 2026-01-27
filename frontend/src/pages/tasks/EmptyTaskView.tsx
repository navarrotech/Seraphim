// Copyright Ac 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { Selection } from '@react-types/shared'

// Core
import { useEffect, useState } from 'react'

// User interface
import { Button, Card, Select, SelectItem, Textarea } from '@heroui/react'

type TaskDraft = {
  message: string
  workspaceId: string
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

  const [ message, setMessage ] = useState<string>('')
  const [ workspaceId, setWorkspaceId ] = useState<string>('')

  useEffect(function syncDefaultWorkspace() {
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

  function handleWorkspaceSelection(selection: Selection) {
    if (selection === 'all') {
      console.debug('EmptyTaskView received an unexpected workspace selection', { selection })
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

    await onSubmit({
      message: trimmedMessage,
      workspaceId,
    })
  }

  const hasWorkspaces = workspaces.length > 0

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
      <div className='level-right'>
        <Button
          color='primary'
          onPress={handleSubmit}
          isLoading={isSubmitting}
          isDisabled={!hasWorkspaces || isSubmitting}
        >
          <span>Send First Message</span>
        </Button>
      </div>
    </Card>
  </div>
}
