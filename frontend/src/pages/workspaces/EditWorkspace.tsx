// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'

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
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'

// Misc
import { getWorkspaceViewUrl, UrlTree } from '@common/urls'
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
      name: '',
      repository: '',
      containerImage: '',
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

  useEffect(function syncWorkspace() {
    if (!workspaceQuery.data?.workspace) {
      return
    }

    const workspace = workspaceQuery.data.workspace
    form.reset({
      name: workspace.name,
      repository: workspace.repository,
      containerImage: workspace.containerImage,
      description: workspace.description || '',
      setupScript: workspace.setupScript || '',
      postScript: workspace.postScript || '',
      cacheFiles: workspace.cacheFiles || [],
      envEntries: ensureEnvEntries(workspace.envEntries as Environment[]),
    })
  }, [ form, workspaceQuery.data ])

  const onSubmit = form.handleSubmit(async function onSubmit(data) {
    if (!workspaceId) {
      console.debug('EditWorkspace cannot submit without workspaceId', { workspaceId })
      return
    }

    try {
      const response = await updateWorkspace(workspaceId, data)
      navigate(
        getWorkspaceViewUrl(
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
            isDisabled={form.formState.isSubmitting}
          >
            <span>Save Changes</span>
          </Button>
        </div>
      </div>
    </div>
    <Form onSubmit={onSubmit} className='relaxed'>
      <Card className='relaxed p-4 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
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
            <div className='relaxed w-full'>
              <Controller
                control={form.control}
                name='containerImage'
                render={({ field }) => (
                  <Input
                    label='Container image'
                    placeholder='node:24-bullseye'
                    className='w-full'
                    isRequired
                    isInvalid={Boolean(form.formState.errors.containerImage)}
                    errorMessage={form.formState.errors.containerImage?.message}
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
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
                  />
                )}
              />
            </div>
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
                label='Setup script'
                className='w-full'
                placeholder='Commands to prepare the workspace environment.'
                minRows={6}
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
                label='Validate work script'
                className='w-full'
                placeholder='Deterministic commands to run and check the workspace with.'
                minRows={6}
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
