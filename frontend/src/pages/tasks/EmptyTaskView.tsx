// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { LlmRecord } from '@common/types'
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
  llmId: string
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

  const llms = useSelector((state) => state.llms.items)

  const [ message, setMessage ] = useState<string>('')
  const [ workspaceId, setWorkspaceId ] = useState<string>('')
  const [ llmId, setLlmId ] = useState<string>('')

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
    const defaultLlm = llms.find((llm) => llm.isDefault)
    if (defaultLlm) {
      setLlmId(defaultLlm.id)
      return
    }

    if (llms.length > 0) {
      setLlmId(llms[0].id)
      return
    }

    console.debug('EmptyTaskView has no llms to select from')
  }, [ llms ])

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

  function handleLlmSelection(selection: Selection) {
    if (selection === 'all') {
      console.debug('EmptyTaskView received an unexpected llm selection', {
        selection,
      })
      return
    }

    const selectedKeys = Array.from(selection)
    const selectedLlmId = selectedKeys[0]

    if (!selectedLlmId) {
      console.debug('EmptyTaskView failed to select a llm', { selection })
      return
    }

    setLlmId(String(selectedLlmId))
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

    if (!llmId) {
      console.debug('EmptyTaskView cannot submit without a llm')
      return
    }

    await onSubmit({
      message: trimmedMessage,
      workspaceId,
      llmId,
    })
  }

  const hasWorkspaces = workspaces.length > 0
  const hasLlms = llms.length > 0
  const isMessageEmpty = message.trim().length === 0
  const isSubmitDisabled = isSubmitting
    || !workspaceId
    || !llmId
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
          label='Llm'
          placeholder='Select a llm'
          selectedKeys={llmId ? [ llmId ] : []}
          onSelectionChange={handleLlmSelection}
          isDisabled={!hasLlms || isSubmitting}
        >
          {llms.map((llm) => (
            <SelectItem key={llm.id}>
              {getLlmLabel(llm)}
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

function getLlmLabel(llm: LlmRecord) {
  if (llm.name) {
    return llm.name
  }

  if (llm.type === 'OPENAI_API_KEY') {
    return 'OpenAI (API key)'
  }

  if (llm.type === 'OPENAI_LOGIN_TOKEN') {
    return 'OpenAI (Login token)'
  }


  console.debug('EmptyTaskView received an unsupported llm type', {
    llmType: llm.type,
  })

  return llm.type
}
