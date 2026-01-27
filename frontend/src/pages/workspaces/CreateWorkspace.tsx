// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'

// Core
import { useNavigate } from 'react-router-dom'

// Lib
import { useFormPersist } from '@liorpo/react-hook-form-persist'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

// UI
import { Button, Card, Form, Input, Textarea } from '@heroui/react'
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'

// Misc
import { UrlTree } from '@common/urls'
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

  const onSubmit = form.handleSubmit(async function onSubmit(data) {
    try {
      const response = await createWorkspace(data)

      clear()

      navigate(UrlTree.tasksList)
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
            {/* Container image */}
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
          {/* Setup script */}
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
          {/* Validate script */}
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
