// Copyright © 2026 Jalapeno Labs

import type { RepoOption } from './CreateWorkspaceImportDrawer'

// Core
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Lib
import { useFormPersist } from '@liorpo/react-hook-form-persist'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// Redux
import { useSelector } from '@frontend/framework/store'

// UI
import { Button, Card, Form } from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'
import {
  createWorkspace,
  createWorkspaceSchema,
} from '@frontend/lib/routes/workspaceRoutes'
import { CreateWorkspaceImportDrawer } from './CreateWorkspaceImportDrawer'
import { WorkspaceEditorForm } from './WorkspaceEditorForm'

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

type BuildState = {
  isBuilding: boolean
}

export function CreateWorkspace() {
  const navigate = useNavigate()
  const authAccounts = useSelector((reduxState) => reduxState.accounts.items)
  const isImportDisabled = authAccounts.length === 0
  const [ isImportDrawerOpen, setIsImportDrawerOpen ] = useState(false)
  const [ importedRepoOption, setImportedRepoOption ] = useState<RepoOption | null>(null)
  const [ buildState, setBuildState ] = useState<BuildState>({
    isBuilding: false,
  })

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      gitUserName: '',
      gitUserEmail: '',
      name: '',
      repository: '',
      customDockerfileCommands: '',
      description: '',
      setupScript: 'yarn install',
      postScript: 'yarn typecheck\nyarn lint\nyarn test\nyarn build',
      cacheFiles: [],
      envEntries: [{
        key: '',
        value: '',
      }],
    },
  })

  const { clear } = useFormPersist<CreateWorkspaceFormValues>('create-workspace', {
    control: form.control,
    setValue: form.setValue,
    onDataRestored: (values) => form.reset(values),
  })

  const isFormLocked = buildState.isBuilding || form.formState.isSubmitting
  const isRepositoryLocked = Boolean(importedRepoOption)

  function handleOpenImportDrawer() {
    setIsImportDrawerOpen(true)
  }

  function handleImportDrawerOpenChange(isOpen: boolean) {
    setIsImportDrawerOpen(isOpen)
  }

  function handleBuildStateChange(isBuilding: boolean) {
    setBuildState({
      isBuilding,
    })
  }

  function handleImportRepo(repoOption: RepoOption) {
    form.setValue('name', repoOption.repo.name, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    form.setValue('repository', repoOption.repo.cloneUrl, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    form.setValue('authAccountId', repoOption.accountId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })

    const trimmedAccountName = repoOption.name.trim()
    const trimmedUsername = repoOption.username.trim()
    const isNameMissing = trimmedAccountName.length === 0
      || trimmedAccountName === trimmedUsername

    if (isNameMissing) {
      console.debug('CreateWorkspace import missing git user name', {
        accountId: repoOption.accountId,
      })
      form.setValue('gitUserName', '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    else {
      form.setValue('gitUserName', trimmedAccountName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }

    if (!repoOption.email || repoOption.email.trim().length === 0) {
      console.debug('CreateWorkspace import missing git user email', {
        accountId: repoOption.accountId,
      })
      form.setValue('gitUserEmail', '', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    else {
      form.setValue('gitUserEmail', repoOption.email, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }

    setImportedRepoOption(repoOption)
    setIsImportDrawerOpen(false)
  }

  const onSubmit = form.handleSubmit(async function onSubmit(data) {
    try {
      await createWorkspace(data)
      clear()
      navigate(UrlTree.tasksList)
    }
    catch (error) {
      console.debug('CreateWorkspace failed to submit form', { error })
    }
  })

  let importBanner = null
  if (importedRepoOption) {
    importBanner = <Card className='relaxed p-4 border border-emerald-500/30 bg-emerald-500/10'>
      <div className='text-lg'>
        <strong>Importing repository</strong>
      </div>
      <p className='opacity-80'>
        Connected to {importedRepoOption.repo.fullName} via {importedRepoOption.username}.
      </p>
    </Card>
  }

  return <section className='container p-6'>
    <div className='relaxed'>
      <div className='level'>
        <h2 className='text-2xl'>
          <strong>Create Workspace</strong>
        </h2>
        <Button
          type='button'
          variant='flat'
          isDisabled={isImportDisabled || isFormLocked}
          onPress={handleOpenImportDrawer}
        >
          <span>Import</span>
        </Button>
      </div>
      <p className='opacity-80'>
        Define a workspace with its repository, scripts, and environment values.
      </p>
    </div>
    <div className='relaxed'>
      {importBanner}
    </div>
    <Form onSubmit={onSubmit} className='relaxed'>
      <input type='hidden' {...form.register('authAccountId')} />
      <WorkspaceEditorForm
        form={form}
        isFormLocked={isFormLocked}
        isRepositoryLocked={isRepositoryLocked}
        autoFocusWorkspaceName
        onBuildStateChange={handleBuildStateChange}
        footer={<Button
          type='submit'
          color='primary'
          className='mx-auto'
          isLoading={form.formState.isSubmitting}
          isDisabled={isFormLocked}
        >
          <span>Create Workspace</span>
        </Button>}
      />
      <CreateWorkspaceImportDrawer
        isOpen={isImportDrawerOpen}
        isDisabled={isImportDisabled || isFormLocked}
        onOpenChange={handleImportDrawerOpenChange}
        onImport={handleImportRepo}
      />
    </Form>
  </section>
}
