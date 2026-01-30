// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'
import type { RepoOption } from './CreateWorkspaceImportDrawer'

// Core
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Lib
import { useFormPersist } from '@liorpo/react-hook-form-persist'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ControllerRenderProps } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

// Redux
import { useSelector } from '@frontend/framework/store'

// UI
import { Button, Card, Form, Input, Textarea } from '@heroui/react'
import { BuildLogsPanel } from '@frontend/common/BuildLogsPanel'
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'
import { Monaco } from '@frontend/common/Monaco'

// Utility
import { useApiBuildSocket } from '@frontend/hooks/useApiBuildSocket'

// Misc
import { UrlTree } from '@common/urls'
import {
  createWorkspace,
  createWorkspaceSchema,
} from '@frontend/lib/routes/workspaceRoutes'
import { CreateWorkspaceImportDrawer } from './CreateWorkspaceImportDrawer'
import { DEFAULT_DOCKER_BASE_IMAGE } from '@common/constants'

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>
export function CreateWorkspace() {
  const navigate = useNavigate()
  const authAccounts = useSelector((reduxState) => reduxState.accounts.items)
  const buildSocket = useApiBuildSocket()
  const isImportDisabled = authAccounts.length === 0
  const [ isImportDrawerOpen, setIsImportDrawerOpen ] = useState(false)
  const [ importedRepoOption, setImportedRepoOption ] = useState<RepoOption | null>(null)

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      gitUserName: '',
      gitUserEmail: '',
      name: '',
      repository: '',
      containerImage: 'node:latest',
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

  const isFormLocked = buildSocket.isBuilding || form.formState.isSubmitting
  const isRepositoryLocked = Boolean(importedRepoOption)

  function handleDockerfileCommandsChange(
    onChange: ControllerRenderProps<CreateWorkspaceFormValues, 'customDockerfileCommands'>['onChange'],
  ) {
    return function handleChange(value: string | undefined) {
      if (value === undefined) {
        console.debug('CreateWorkspace received empty dockerfile commands input')
        onChange('')
        return
      }

      onChange(value)
    }
  }

  function renderDockerfileCommandsField(
    props: { field: ControllerRenderProps<CreateWorkspaceFormValues, 'customDockerfileCommands'> },
  ) {
    const { field } = props
    return <div className='relaxed w-full'>
      <label className='text-sm font-medium'>Custom Dockerfile commands</label>
      <Monaco
        height='220px'
        fileLanguage='dockerfile'
        minimapOverride={false}
        value={field.value}
        onChange={handleDockerfileCommandsChange(field.onChange)}
        readOnly={isFormLocked}
      />
    </div>
  }

  function handleOpenImportDrawer() {
    setIsImportDrawerOpen(true)
  }

  function handleImportDrawerOpenChange(isOpen: boolean) {
    setIsImportDrawerOpen(isOpen)
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
    const trimmedDisplayName = repoOption.displayName.trim()
    const trimmedUsername = repoOption.username.trim()
    const isNameMissing = trimmedDisplayName.length === 0
      || trimmedDisplayName === trimmedUsername
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
      form.setValue('gitUserName', trimmedDisplayName, {
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

  async function handleBuildImage() {
    const values = form.getValues()
    const containerImage = values.containerImage?.trim()

    if (!containerImage) {
      console.debug('CreateWorkspace build requested without container image', { values })
      buildSocket.resetBuild()
      return
    }

    await buildSocket.startBuild({
      containerImage,
      customDockerfileCommands: values.customDockerfileCommands || '',
    })
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
        Define a workspace with its repo, image, and environment.
      </p>
    </div>
    <div className='relaxed'>{
        importBanner
      }</div>
    <Form onSubmit={onSubmit} className='relaxed'>
      <input type='hidden' {...form.register('authAccountId')} />
      <Card className='relaxed p-4 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
            {/* Git user */}
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='gitUserName'
                render={({ field }) => (
                  <Input
                    label='Git user name'
                    placeholder='Ada Lovelace'
                    className='w-full'
                    isRequired
                    isInvalid={Boolean(form.formState.errors.gitUserName)}
                    errorMessage={form.formState.errors.gitUserName?.message}
                    isDisabled={isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            {/* Git email */}
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='gitUserEmail'
                render={({ field }) => (
                  <Input
                    label='Git email'
                    placeholder='ada@lovelace.dev'
                    className='w-full'
                    isRequired
                    isInvalid={Boolean(form.formState.errors.gitUserEmail)}
                    errorMessage={form.formState.errors.gitUserEmail?.message}
                    isDisabled={isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            {/* Workspace name */}
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='name'
                render={({ field }) => (
                  <Input
                    autoFocus
                    label='Workspace name'
                    placeholder='Seraphim Playground'
                    className='w-full'
                    isRequired
                    isInvalid={Boolean(form.formState.errors.name)}
                    errorMessage={form.formState.errors.name?.message}
                    isDisabled={isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            {/* Repository URL */}
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='repository'
                render={({ field }) => (
                  <Input
                    label='Repository URL'
                    placeholder='git@github.com:navarrotech/seraphim.git'
                    className='w-full'
                    isRequired
                    isInvalid={Boolean(form.formState.errors.repository)}
                    errorMessage={form.formState.errors.repository?.message}
                    isDisabled={isRepositoryLocked || isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            {/* Description */}
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='description'
                render={({ field }) => (
                  <Textarea
                    label='Description'
                    placeholder='What does this workspace do?'
                    className='w-full'
                    minRows={5}
                    isDisabled={isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
          </div>
          <div className='w-full'>
            <div>
              <h4 className='compact text-xl'>Environment Variables</h4>
              <Controller
                control={form.control}
                name='envEntries'
                render={({ field }) => (
                  <EnvironmentInputs
                    id='workspace-environment'
                    entries={field.value || []}
                    onEntriesChange={(entries: Environment[]) =>
                      field.onChange(entries)}
                    isDisabled={isFormLocked}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </Card>
      <Card className='relaxed p-4 w-full'>
        <div className='relaxed'>
          <h3 className='text-xl'>Docker</h3>
          <p className='opacity-80'>
            Customize the base image and Dockerfile steps.
          </p>
        </div>
        <div className='level w-full items-start'>
          <div className='w-full'>
            <div className='relaxed'>
              <Controller
                control={form.control}
                name='containerImage'
                render={({ field }) => (
                  <Input
                    label='Container image'
                    placeholder={DEFAULT_DOCKER_BASE_IMAGE}
                    className='w-full'
                    isRequired
                    isInvalid={Boolean(form.formState.errors.containerImage)}
                    errorMessage={form.formState.errors.containerImage?.message}
                    isDisabled={isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            <div className='relaxed'>
              <Controller
                control={form.control}
                name='customDockerfileCommands'
                render={renderDockerfileCommandsField}
              />
            </div>
            <Button
              type='button'
              color='primary'
              isLoading={buildSocket.isBuilding}
              isDisabled={isFormLocked}
              onPress={handleBuildImage}
            >
              <span>Build Image</span>
            </Button>
          </div>
          <div className='w-full'>
            <BuildLogsPanel buildSocket={buildSocket} />
          </div>
        </div>
      </Card>
      <Card className='relaxed p-4 w-full'>
        <div className='level w-full items-start'>
          {/* Setup script */}
          <Controller
            control={form.control}
            name='setupScript'
            render={({ field }) => (
              <Textarea
                label='Setup script (bash)'
                className='w-full'
                placeholder='Commands to prepare the workspace environment.'
                minRows={6}
                isDisabled={isFormLocked}
                value={field.value}
                name={field.name}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {/* Validate script */}
          <Controller
            control={form.control}
            name='postScript'
            render={({ field }) => (
              <Textarea
                label='Validate work script (bash)'
                className='w-full'
                placeholder='Deterministic commands to run and check the workspace with.'
                minRows={6}
                isDisabled={isFormLocked}
                value={field.value}
                name={field.name}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
      </Card>
      <Button
        type='submit'
        color='primary'
        className='mx-auto'
        isLoading={form.formState.isSubmitting}
        isDisabled={isFormLocked}
      >
        <span>
          Create Workspace
        </span>
      </Button>
      <CreateWorkspaceImportDrawer
        isOpen={isImportDrawerOpen}
        isDisabled={isImportDisabled || isFormLocked}
        onOpenChange={handleImportDrawerOpenChange}
        onImport={handleImportRepo}
      />
    </Form>
  </section>
}
