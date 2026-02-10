// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'
import type { z } from 'zod'

// Core
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import useSWR from 'swr'

// UI
import { Button, Card } from '@heroui/react'
import { WorkspaceEditorForm } from './WorkspaceEditorForm'

// Utility
import { useHotkey } from '@frontend/hooks/useHotkey'

// Misc
import { getWorkspaceEditUrl, UrlTree } from '@common/urls'
import {
  getWorkspace,
  updateWorkspace,
  createWorkspaceSchema,
} from '@frontend/lib/routes/workspaceRoutes'

type EditWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>
const zodResolved = zodResolver(createWorkspaceSchema)

const defaultValues: EditWorkspaceFormValues = {
  name: '',
  sourceRepoUrl: '',
  customDockerfileCommands: '',
  description: '',
  setupScript: '',
  postScript: '',
  cacheFiles: [],
  envEntries: [{
    key: '',
    value: '',
  }],
}

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
  const [ isSubmitting, setIsSubmitting ] = useState(false)

  if (!workspaceId) {
    console.debug('EditWorkspace missing workspaceId in route params', { workspaceId })
  }

  const workspaceQuery = useSWR(
    workspaceId ? `workspace-${workspaceId}` : null,
    () => getWorkspace(workspaceId || ''),
  )

  const form = useForm<EditWorkspaceFormValues>({
    resolver: zodResolved,
    defaultValues,
  })

  const isFormLocked = isSubmitting

  useEffect(function syncWorkspace() {
    if (!workspaceQuery.data?.workspace) {
      return
    }

    const workspace = workspaceQuery.data.workspace
    form.reset({
      name: workspace.name,
      sourceRepoUrl: workspace.sourceRepoUrl || '',
      customDockerfileCommands: workspace.customDockerfileCommands || '',
      description: workspace.description || '',
      setupScript: workspace.setupScript || '',
      postScript: workspace.postScript || '',
      cacheFiles: workspace.cacheFiles || [],
      envEntries: ensureEnvEntries(workspace.envEntries),
    })
  }, [ form, workspaceQuery.data ])

  const handleSubmit = useCallback(async function handleSubmit() {
    if (!workspaceId) {
      console.debug('EditWorkspace cannot submit without workspaceId', { workspaceId })
      return
    }

    if (isSubmitting) {
      console.debug('EditWorkspace submit already in progress', { workspaceId })
      return
    }

    const sanitizedValues = form.getValues()
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
      <WorkspaceEditorForm
        form={form}
        isFormLocked={isFormLocked}
      />
    </div>
  </section>
}
