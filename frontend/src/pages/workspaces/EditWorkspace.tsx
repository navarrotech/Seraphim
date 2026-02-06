// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'
import type { ControllerRenderProps } from 'react-hook-form'

// Core
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import useSWR from 'swr'
import { z } from 'zod'

// UI
import { Button, Card, Input, Textarea } from '@heroui/react'
import { BuildLogsPanel } from '@frontend/common/BuildLogsPanel'
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'
import { Monaco } from '@frontend/common/Monaco'
import { BaseDockerImageNotice } from '@frontend/common/workspaces/BaseDockerImageNotice'

// Utility
import { useApiBuildSocket } from '@frontend/hooks/useApiBuildSocket'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Misc
import { getWorkspaceEditUrl, UrlTree } from '@common/urls'
import { getWorkspace, updateWorkspace, createWorkspaceSchema } from '@frontend/lib/routes/workspaceRoutes'

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
  const [ isSubmitting, setIsSubmitting ] = useState(false)

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

  const isFormLocked = buildSocket.isBuilding || isSubmitting

  function handleDockerfileCommandsChange(
    onChange: ControllerRenderProps<EditWorkspaceFormValues, 'customDockerfileCommands'>['onChange'],
  ) {
    return function onEditorChange(value: string | undefined) {
      if (value === undefined) {
        console.debug('EditWorkspace dockerfile editor returned undefined value')
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

    return <div className='level w-full items-start'>
      <div className='w-full'>
        <div className='relaxed w-full'>
          <label className='text-sm font-medium'>Custom Dockerfile commands</label>
          <BaseDockerImageNotice />
          <Monaco
            height='220px'
            fileLanguage='dockerfile'
            minimapOverride={false}
            value={field.value}
            onChange={handleDockerfileCommandsChange(field.onChange)}
            readOnly={isFormLocked}
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
    await buildSocket.startBuild({
      customDockerfileCommands: values.customDockerfileCommands || '',
    })
  }

  const handleSubmit = useCallback(async function handleSubmit() {
    if (!workspaceId) {
      console.debug('EditWorkspace cannot submit without workspaceId', { workspaceId })
      return
    }

    if (isSubmitting) {
      console.debug('EditWorkspace submit already in progress', { workspaceId })
      return
    }

    const sanitizedValues = sanitizeWorkspaceValues(form.getValues())
    const validationResult = createWorkspaceSchema.safeParse(sanitizedValues)
    if (!validationResult.success) {
      console.debug('EditWorkspace form validation failed', {
        errors: validationResult.error.flatten(),
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await updateWorkspace(workspaceId, validationResult.data)
      navigate(
        getWorkspaceEditUrl(
          response.workspace.id,
        ),
      )
    }
    catch (error) {
      console.debug('EditWorkspace failed to update workspace', { error })
    }
    finally {
      setIsSubmitting(false)
    }
  }, [ form, isSubmitting, navigate, workspaceId ])

  const handleSaveHotkey = useCallback(
    async function handleSaveHotkey(event: KeyboardEvent) {
      event.preventDefault()
      await handleSubmit()
    },
    [ handleSubmit ],
  )

  useHotkey(
    [ 'Control', 's' ],
    handleSaveHotkey,
    {
      preventDefault: true,
    },
  )

  if (workspaceQuery.isLoading) {
    return <section className='container p-6'>
      <Card className='p-6'>
        <p className='opacity-80'>Loading workspace...</p>
      </Card>
    </section>
  }

  if (workspaceQuery.error || !workspaceQuery.data?.workspace) {
    return <section className='container p-6'>
      <Card className='p-6 relaxed'>
        <p className='opacity-80'>Unable to load this workspace.</p>
        <Button
          color='primary'
          onPress={() => navigate(UrlTree.workspacesList)}
        >
          <span>Back to Workspaces</span>
        </Button>
      </Card>
    </section>
  }

  return <section className='container p-6'>
    <div className='relaxed'>
      <h2 className='text-2xl'>
        <strong>Edit Workspace</strong>
      </h2>
      <p className='opacity-80'>
        Update repository settings, scripts, and environment values.
      </p>
    </div>
    <div className='relaxed'>
      <Button
        color='primary'
        onPress={handleSubmit}
        isLoading={isSubmitting}
        isDisabled={isFormLocked}
      >
        <span>Save Workspace</span>
      </Button>
    </div>
    <div className='relaxed'>
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
                    onEntriesChange={(entries: Environment[]) => field.onChange(entries)}
                    isDisabled={isFormLocked}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </Card>
      <Card className='relaxed p-4 w-full'>
        <Controller
          control={form.control}
          name='customDockerfileCommands'
          render={renderDockerfileCommandsField}
        />
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
    </div>
  </section>
}

function sanitizeWorkspaceValues(values: EditWorkspaceFormValues) {
  const environmentEntries = (values.envEntries || [])
    .map((entry) => ({
      key: entry.key?.trim() || '',
      value: entry.value?.trim() || '',
    }))
    .filter((entry) => entry.key.length > 0 && entry.value.length > 0)

  return {
    ...values,
    envEntries: environmentEntries,
  }
}
