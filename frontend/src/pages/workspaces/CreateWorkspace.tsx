// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'

// Core
import { useNavigate } from 'react-router-dom'

// Lib
import { useFormPersist } from '@liorpo/react-hook-form-persist'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// UI
import { Button, Card, Form, Input, Textarea } from '@heroui/react'
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'

// Misc
import { getWorkspaceViewUrl } from '@common/urls'
import { createWorkspace, createWorkspaceSchema } from '@frontend/lib/routes/workspaceRoutes'


type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

export function CreateWorkspace() {
  const navigate = useNavigate()

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      repository: '',
      containerImage: 'node:latest',
      description: '',
      setupScript: 'yarn install',
      postScript: 'yarn typecheck\nyarn lint\nyarn test\nyarn build',
      cacheFiles: [],
      envEntries: [{
        key: 'NODE_ENV',
        value: 'development',
      }],
    },
  })

  const { clear } = useFormPersist('create-workspace', {
    control: form.control,
    setValue: form.setValue,
  })

  const envEntries = form.watch('envEntries') || []

  function handleEnvEntriesChange(entries: Environment[]) {
    form.setValue('envEntries', entries, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const onSubmit = form.handleSubmit(async function onSubmit(data) {
    try {
      const response = await createWorkspace(data)

      clear()

      navigate(
        getWorkspaceViewUrl(
          response.workspace.id,
        ),
      )
    }
    catch (error) {
      console.debug('CreateWorkspace failed to submit form', { error })
    }
  })

  return <section className='container p-6'>
    <div className='relaxed'>
      <h2 className='text-2xl'>
        <strong>Create Workspace</strong>
      </h2>
      <p className='opacity-80'>
        Define a workspace with its repo, image, and environment.
      </p>
    </div>
    <Form onSubmit={onSubmit} className='relaxed'>
      <Card className='relaxed p-4 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
            {/* Workspace name */}
            <div className='relaxed w-full'>
              <Input
                autoFocus
                label='Workspace name'
                placeholder='Seraphim Playground'
                className='w-full'
                isRequired
                isInvalid={Boolean(form.formState.errors.name)}
                errorMessage={form.formState.errors.name?.message}
                {...form.register('name')}
              />
            </div>
            {/* Repository URL */}
            <div className='relaxed w-full'>
              <Input
                label='Repository URL'
                placeholder='git@github.com:navarrotech/seraphim.git'
                className='w-full'
                isRequired
                isInvalid={Boolean(form.formState.errors.repository)}
                errorMessage={form.formState.errors.repository?.message}
                {...form.register('repository')}
              />
            </div>
            {/* Description */}
            <div className='relaxed w-full'>
              <Textarea
                label='Description'
                placeholder='What does this workspace do?'
                className='w-full'
                minRows={5}
                {...form.register('description')}
              />
            </div>
          </div>
          <div className='w-full'>
            {/* Container image */}
            <div className='relaxed w-full'>
              <Input
                label='Container image'
                placeholder='node:24-bullseye'
                className='w-full'
                isRequired
                isInvalid={Boolean(form.formState.errors.containerImage)}
                errorMessage={form.formState.errors.containerImage?.message}
                {...form.register('containerImage')}
              />
            </div>
            <div>
              <h4 className='compact text-xl'>Environment Variables</h4>
              <EnvironmentInputs
                id='workspace-environment'
                items={envEntries}
                onChange={handleEnvEntriesChange}
              />
            </div>
          </div>
        </div>
      </Card>
      <Card className='relaxed p-4 w-full'>
        <div className='level w-full items-start'>
          {/* Setup script */}
          <Textarea
            label='Setup script'
            className='w-full'
            placeholder='Commands to prepare the workspace environment.'
            minRows={6}
            {...form.register('setupScript')}
          />
          {/* Validate script */}
          <Textarea
            label='Validate work script'
            className='w-full'
            placeholder='Deterministic commands to run and check the workspace with.'
            minRows={6}
            {...form.register('postScript')}
          />
        </div>
      </Card>
      <Button
        type='submit'
        color='primary'
        className='mx-auto'
        isLoading={form.formState.isSubmitting}
        isDisabled={form.formState.isSubmitting}
      >
        <span>
          Create Workspace
        </span>
      </Button>
    </Form>
  </section>
}
