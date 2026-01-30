// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'
import type { ControllerRenderProps } from 'react-hook-form'

// Core
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import useSWR from 'swr'
import { z } from 'zod'

// UI
import { Button, Card, Form, Input, Textarea } from '@heroui/react'
import { BuildLogsPanel } from '@frontend/common/BuildLogsPanel'
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'
import { Monaco } from '@frontend/common/Monaco'

// Utility
import { useApiBuildSocket } from '@frontend/hooks/useApiBuildSocket'

// Misc
import { getWorkspaceEditUrl, UrlTree } from '@common/urls'
import { getWorkspace, updateWorkspace, createWorkspaceSchema } from '@frontend/lib/routes/workspaceRoutes'
import { DEFAULT_DOCKER_BASE_IMAGE } from '@common/constants'

type EditWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>
type WorkspaceRouteParams = {
  workspaceId?: string
}

function ensureEnvEntries(entries?: Environment[]) {
  if (entries && entries.length > 0) {
    return entries
  }

  return [{
    key: '',
    value: '',
  }]
}

export function EditWorkspace() {
  const navigate = useNavigate()
  const { workspaceId } = useParams<WorkspaceRouteParams>()
  const buildSocket = useApiBuildSocket()

  if (!workspaceId) {
    console.debug('EditWorkspace missing workspaceId in route params', { workspaceId })
  }

  const workspaceQuery = useSWR(
    workspaceId ? `workspace-${workspaceId}` : null,
    () => getWorkspace(workspaceId || ''),
  )

  const form = useForm<EditWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      gitUserName: '',
      gitUserEmail: '',
      name: '',
      repository: '',
      containerImage: '',
      customDockerfileCommands: '',
      description: '',
      setupScript: '',
      postScript: '',
      cacheFiles: [],
      envEntries: [{
        key: '',
        value: '',
      }],
    },
  })

  const isFormLocked = buildSocket.isBuilding || form.formState.isSubmitting

  function handleDockerfileCommandsChange(
    onChange: ControllerRenderProps<EditWorkspaceFormValues, 'customDockerfileCommands'>['onChange'],
  ) {
    return function handleChange(value: string | undefined) {
      if (value === undefined) {
        console.debug('EditWorkspace received empty dockerfile commands input')
        onChange('')
        return
      }

      onChange(value)
    }
  }

  function renderDockerfileCommandsField(
    props: { field: ControllerRenderProps<EditWorkspaceFormValues, 'customDockerfileCommands'> },
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

  useEffect(function syncWorkspace() {
    if (!workspaceQuery.data?.workspace) {
      return
    }

    const workspace = workspaceQuery.data.workspace
    form.reset({
      gitUserName: workspace.gitUserName,
      gitUserEmail: workspace.gitUserEmail,
      name: workspace.name,
      repository: workspace.repository,
      containerImage: workspace.containerImage,
      customDockerfileCommands: workspace.customDockerfileCommands || '',
      description: workspace.description || '',
      setupScript: workspace.setupScript || '',
      postScript: workspace.postScript || '',
      cacheFiles: workspace.cacheFiles || [],
      envEntries: ensureEnvEntries(workspace.envEntries as Environment[]),
    })
  }, [ form, workspaceQuery.data ])

  async function handleBuildImage() {
    const values = form.getValues()
    const containerImage = values.containerImage?.trim()

    if (!containerImage) {
      console.debug('EditWorkspace build requested without container image', { values })
      buildSocket.resetBuild()
      return
    }

    await buildSocket.startBuild({
      containerImage,
      customDockerfileCommands: values.customDockerfileCommands || '',
    })
  }

  const onSubmit = form.handleSubmit(async function onSubmit(data) {
    if (!workspaceId) {
      console.debug('EditWorkspace cannot submit without workspaceId', { workspaceId })
      return
    }

    try {
      const response = await updateWorkspace(workspaceId, data)
      navigate(
        getWorkspaceEditUrl(
          response.workspace.id,
        ),
      )
    }
    catch (error) {
      console.debug('EditWorkspace failed to update workspace', { error })
    }
  })

  if (workspaceQuery.isLoading) {
    return <section className='container p-6'>
      <Card className='p-6'>
        <p className='opacity-80'>Loading workspace...</p>
      </Card>
    </section>
  }

  if (workspaceQuery.error) {
    return <section className='container p-6'>
      <Card className='p-6'>
        <p className='opacity-80'>Unable to load workspace.</p>
      </Card>
    </section>
  }

  return <section className='container p-6'>
    <div className='relaxed'>
      <div className='level'>
        <div>
          <h2 className='text-2xl'>
            <strong>Edit Workspace</strong>
          </h2>
          <p className='opacity-80'>Refine the repo, image, and environment for this workspace.</p>
        </div>
        <div className='level-right'>
          <Button
            variant='light'
            onPress={() => navigate(UrlTree.workspacesList)}
          >
            Back to list
          </Button>
          <Button
            type='submit'
            color='primary'
            isLoading={form.formState.isSubmitting}
            isDisabled={isFormLocked}
            form='edit-workspace-form'
          >
            <span>Save Changes</span>
          </Button>
        </div>
      </div>
    </div>
    <Form onSubmit={onSubmit} className='relaxed' id='edit-workspace-form'>
      <Card className='relaxed p-4 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
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
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='name'
                render={({ field }) => (
                  <Input
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
                    isDisabled={isFormLocked}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
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
    </Form>
  </section>
}
