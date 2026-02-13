// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'
import type { Key } from 'react'
import type { LlmRecord } from '@common/types'
import type { Selection } from '@react-types/shared'
import type {
  ConnectedAccount,
  GithubBranchSummary,
} from '@frontend/lib/routes/accountsRoutes'

// Core
import { useEffect, useState } from 'react'

// Lib
import useSWR from 'swr'

// Redux
import { useSelector } from '@frontend/framework/store'

// User interface
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  Select,
  SelectItem,
  Input,
  Textarea,
} from '@heroui/react'

// Utility
import { useDebouncedState } from '@frontend/hooks/useDebouncedState'

// Misc
import { listBranches } from '@frontend/lib/routes/accountsRoutes'

type TaskDraft = {
  message: string
  workspaceId: string
  authAccountId: string
  llmId: string
  branch: string
  issueLink: string
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
  const [ branch, setBranch ] = useState<string>('')
  const [ issueLink, setIssueLink ] = useState<string>('')
  const [ branchSearchQuery, setBranchSearchQuery ] = useState<string>('')

  const debouncedBranchSearchQuery = useDebouncedState(branchSearchQuery, 250)

  const selectedWorkspace = getWorkspaceById(workspaces, workspaceId)
  const selectedWorkspaceRepoUrl = selectedWorkspace?.sourceRepoUrl?.trim() || ''

  const shouldLoadBranches = Boolean(
    workspaceId
    && authAccountId
    && selectedWorkspaceRepoUrl,
  )

  const branchesQuery = useSWR(
    () => {
      if (!shouldLoadBranches) {
        return null
      }

      return [
        'task-branches',
        workspaceId,
        authAccountId,
        debouncedBranchSearchQuery,
      ]
    },
    () => listBranches({
      workspaceId,
      authAccountId,
      searchQuery: debouncedBranchSearchQuery,
      page: 1,
      limit: 50,
    }),
  )

  const branchOptions = branchesQuery.data?.branches || []

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

  useEffect(() => {
    setBranch('')
    setBranchSearchQuery('')
  }, [ workspaceId, authAccountId ])

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

  function handleBranchSearchChange(value: string) {
    setBranchSearchQuery(value)

    if (!branch) {
      return
    }

    console.debug('EmptyTaskView clearing selected branch after branch query changed', {
      previousBranch: branch,
      value,
    })
    setBranch('')
  }

  function handleBranchSelection(selection: Key | null) {
    if (!selection) {
      console.debug('EmptyTaskView cleared branch selection')
      setBranch('')
      return
    }

    const selectedBranchName = selection.toString().trim()

    if (!selectedBranchName) {
      console.debug('EmptyTaskView received an empty branch selection', {
        selection,
      })
      setBranch('')
      return
    }

    setBranch(selectedBranchName)
    setBranchSearchQuery(selectedBranchName)
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

    if (!branch) {
      console.debug('EmptyTaskView cannot submit without a branch')
      return
    }

    await onSubmit({
      message: trimmedMessage,
      workspaceId,
      authAccountId,
      llmId,
      branch,
      issueLink: issueLink.trim(),
    })
  }

  const hasWorkspaces = workspaces.length > 0
  const hasAuthAccounts = authAccounts.length > 0
  const hasLlms = llms.length > 0
  const isMessageEmpty = message.trim().length === 0
  const isBranchLoading = branchesQuery.isLoading
  const isBranchSelectionDisabled = isSubmitting || !shouldLoadBranches
  const isSubmitDisabled = isSubmitting
    || !workspaceId
    || !authAccountId
    || !llmId
    || !branch
    || isMessageEmpty

  let branchHelp = null
  if (!workspaceId) {
    branchHelp = <Card className='p-4'>
      <p className='opacity-80'>Select a workspace first to load its branches.</p>
    </Card>
  }
  else if (!selectedWorkspaceRepoUrl) {
    branchHelp = <Card className='p-4'>
      <p className='opacity-80'>
        The selected workspace has no repository. Add a repository to load branches.
      </p>
    </Card>
  }
  else if (branchesQuery.error) {
    branchHelp = <Card className='p-4'>
      <p className='opacity-80'>Unable to load branches right now. Please try again.</p>
    </Card>
  }
  else if (!isBranchLoading && shouldLoadBranches && branchOptions.length === 0) {
    branchHelp = <Card className='p-4'>
      <p className='opacity-80'>
        No branches found for this repository.
      </p>
    </Card>
  }

  return <div className='flex h-full items-center justify-center p-10'>
    <Card className='w-full max-w-3xl p-8'>
      <div className='relaxed text-center'>
        <h2 className='text-2xl'>
          <strong>Start a new task</strong>
        </h2>
        <p className='opacity-80'>
          Share a first message, then pick a workspace, branch, auth account, and llm.
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
        <Input
          label='Issue link (optional)'
          placeholder='https://github.com/org/repo/issues/123'
          value={issueLink}
          onValueChange={setIssueLink}
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
        <Autocomplete
          label='Branch'
          placeholder='Type to search branches...'
          inputValue={branchSearchQuery}
          onInputChange={handleBranchSearchChange}
          selectedKey={branch || undefined}
          onSelectionChange={handleBranchSelection}
          isLoading={isBranchLoading}
          isDisabled={isBranchSelectionDisabled}
          items={branchOptions}
          isRequired
        >
          {(branchOption) =>
            <AutocompleteItem key={branchOption.name} textValue={branchOption.name}>
              {getBranchLabel(branchOption, branchesQuery.data?.defaultBranch || null)}
            </AutocompleteItem>
          }
        </Autocomplete>
      </div>
      <div className='relaxed'>
        {branchHelp}
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

function getWorkspaceById(workspaces: Workspace[], workspaceId: string): Workspace | null {
  const workspace = workspaces.find((entry) => entry.id === workspaceId)

  if (!workspace && workspaceId) {
    console.debug('EmptyTaskView could not resolve selected workspace from list', {
      workspaceId,
    })
  }

  return workspace || null
}

function getBranchLabel(branchOption: GithubBranchSummary, defaultBranch: string | null) {
  if (defaultBranch && branchOption.name === defaultBranch) {
    return `${branchOption.name} (default)`
  }

  return branchOption.name
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
