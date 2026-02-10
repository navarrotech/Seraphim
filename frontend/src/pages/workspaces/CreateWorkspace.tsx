// Copyright © 2026 Jalapeno Labs

// Core
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Lib
import { useFormPersist } from '@liorpo/react-hook-form-persist'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// UI
import { Button, Form } from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'
import {
  createWorkspace,
  createWorkspaceSchema,
} from '@frontend/lib/routes/workspaceRoutes'
import { WorkspaceEditorForm } from './WorkspaceEditorForm'

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

type BuildState = {
  isBuilding: boolean
}

export function CreateWorkspace() {
  const navigate = useNavigate()
  const [ buildState, setBuildState ] = useState<BuildState>({
    isBuilding: false,
  })

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      authAccountId: '',
      name: '',
      repositoryId: 0,
      repositoryFullName: '',
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

  function handleBuildStateChange(isBuilding: boolean) {
    setBuildState({
      isBuilding,
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

  return <section className='container p-6'>
    <div className='relaxed'>
      <h2 className='text-2xl'>
        <strong>Create Workspace</strong>
      </h2>
      <p className='opacity-80'>
        Define a workspace with its repository, scripts, and environment values.
      </p>
    </div>
    <Form onSubmit={onSubmit} className='relaxed'>
      <WorkspaceEditorForm
        form={form}
        isFormLocked={isFormLocked}
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
    </Form>
  </section>
}
