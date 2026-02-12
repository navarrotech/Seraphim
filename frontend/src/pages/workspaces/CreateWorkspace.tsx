// Copyright © 2026 Jalapeno Labs

// Core
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// UI
import { Button } from '@heroui/react'
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
  name: '',
  sourceRepoUrl: '',
  gitBranchTemplate: '',
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

export function CreateWorkspace() {
  const navigate = useNavigate()

  const form = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolved,
    defaultValues,
  })

  const isFormLocked = form.formState.isSubmitting

  const handleSubmit = useCallback(async () => {
    const submitWithValidation = form.handleSubmit(
      async (data) => {
        try {
          await createWorkspace(data)
          navigate(UrlTree.tasksList)
        }
        catch (error) {
          console.debug('CreateWorkspace failed to submit form', { error })
        }
      },
    )

    await submitWithValidation()
  }, [ form, navigate ])

  if (form.formState.errors) {
    console.debug(form.formState.errors)
  }

  return <section className='container p-6'>
    <div className='relaxed level'>
      <div className='w-full'>
        <h2 className='text-2xl'>
          <strong>Create Workspace</strong>
        </h2>
        <p className='opacity-80'>
          Define a workspace with its repository, scripts, and environment values.
        </p>
      </div>
      <Button
        color='primary'
        className='mx-auto'
        isLoading={form.formState.isSubmitting}
        isDisabled={isFormLocked}
        onPress={handleSubmit}
      >
        <span>Create Workspace</span>
      </Button>
    </div>
    <div className='relaxed'>
      <WorkspaceEditorForm
        form={form}
        autoFocusWorkspaceName
        isFormLocked={isFormLocked}
      />
    </div>
  </section>
}
