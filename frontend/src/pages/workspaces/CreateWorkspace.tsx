// Copyright © 2026 Jalapeno Labs

// Core
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// UI
import { Button, Form } from '@heroui/react'
import { WorkspaceEditorForm } from './WorkspaceEditorForm'

// Misc
import { UrlTree } from '@common/urls'
import {
  createWorkspace,
  createWorkspaceSchema,
} from '@frontend/lib/routes/workspaceRoutes'

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>
const zodResolved = zodResolver(createWorkspaceSchema)

const defaultValues: CreateWorkspaceFormValues = {
  authAccountId: '',
  name: '',
  sourceRepoUrl: '',
  customDockerfileCommands: '',
  description: '',
  setupScript: 'yarn install',
  postScript: 'yarn typecheck\nyarn lint\nyarn test\nyarn build',
  cacheFiles: [],
  envEntries: [{
    key: '',
    value: '',
  }],
}

type BuildState = {
  isBuilding: boolean
}

export function CreateWorkspace() {
  const navigate = useNavigate()
  const [ buildState, setBuildState ] = useState<BuildState>({
    isBuilding: false,
  })

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolved,
    defaultValues,
  })

  const isFormLocked = buildState.isBuilding || form.formState.isSubmitting

  const handleBuildStateChange = useCallback((isBuilding: boolean) => {
    setBuildState({
      isBuilding,
    })
  }, [])

  const onSubmit = useCallback(() => form.handleSubmit(
    async (data) => {
      try {
        console.log(data)
        await createWorkspace(data)
        navigate(UrlTree.tasksList)
      }
      catch (error) {
        console.debug('CreateWorkspace failed to submit form', { error })
      }
    },
    ), [])

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
          onPress={() => onSubmit()}
        >
          <span>Create Workspace</span>
        </Button>}
      />
    </Form>
  </section>
}
