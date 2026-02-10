// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { LlmRecord } from '@common/types'
import type { Selection } from '@react-types/shared'
import type { ConnectedAccount } from '@frontend/lib/routes/accountsRoutes'

// Core
import { useEffect, useState } from 'react'

// Redux
import { useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Select, SelectItem, Textarea } from '@heroui/react'

type TaskDraft = {
  message: string
  workspaceId: string
  authAccountId: string
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
  const authAccounts = useSelector((state) => state.accounts.items)

  const [ message, setMessage ] = useState<string>('')
  const [ workspaceId, setWorkspaceId ] = useState<string>('')
  const [ authAccountId, setAuthAccountId ] = useState<string>('')
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
    if (authAccounts.length > 0) {
      setAuthAccountId(authAccounts[0].id)
      return
    }

    console.debug('EmptyTaskView has no auth accounts to select from')
  }, [ authAccounts ])

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

  function handleAuthAccountSelection(selection: Selection) {
    if (selection === 'all') {
      console.debug('EmptyTaskView received an unexpected auth account selection', {
        selection,
      })
      return
    }

    const selectedKeys = Array.from(selection)
    const selectedAuthAccountId = selectedKeys[0]

    if (!selectedAuthAccountId) {
      console.debug('EmptyTaskView failed to select an auth account', { selection })
      return
    }

    setAuthAccountId(String(selectedAuthAccountId))
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

    if (!authAccountId) {
      console.debug('EmptyTaskView cannot submit without an auth account')
      return
    }

    if (!llmId) {
      console.debug('EmptyTaskView cannot submit without a llm')
      return
    }

    await onSubmit({
      message: trimmedMessage,
      workspaceId,
      authAccountId,
      llmId,
    })
  }

  const hasWorkspaces = workspaces.length > 0
  const hasAuthAccounts = authAccounts.length > 0
  const hasLlms = llms.length > 0
  const isMessageEmpty = message.trim().length === 0
  const isSubmitDisabled = isSubmitting
    || !workspaceId
    || !authAccountId
    || !llmId
    || isMessageEmpty

  return <div className='flex h-full items-center justify-center p-10'>
    <Card className='w-full max-w-3xl p-8'>
      <div className='relaxed text-center'>
        <h2 className='text-2xl'>
          <strong>Start a new task</strong>
        </h2>
        <p className='opacity-80'>
          Share a first message, then pick a workspace, auth account, and llm.
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
          label='Auth account'
          placeholder='Select an auth account'
          selectedKeys={authAccountId ? [ authAccountId ] : []}
          onSelectionChange={handleAuthAccountSelection}
          isDisabled={!hasAuthAccounts || isSubmitting}
        >
          {authAccounts.map((authAccount) => (
            <SelectItem key={authAccount.id}>
              {getAuthAccountLabel(authAccount)}
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

function getAuthAccountLabel(authAccount: ConnectedAccount) {
  if (authAccount.username) {
    return `${authAccount.name} (${authAccount.username})`
  }

  if (authAccount.name) {
    return authAccount.name
  }

  console.debug('EmptyTaskView received an auth account missing name and username', {
    authAccountId: authAccount.id,
  })

  return authAccount.id
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
