// Copyright © 2026 Jalapeno Labs

import type { WorkspaceWithEnv } from '@common/types'

// Core
import { useCallback, useEffect } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Lib
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// User Interface
import { Input, Textarea } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { DisplayErrors } from '@frontend/elements/DisplayErrors'
import { SaveButton } from '@frontend/elements/SaveButton'
import { ResetButton } from '@frontend/elements/ResetButton'
import { CloseButton } from '@frontend/elements/CloseButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'

// Misc
import { upsertWorkspaceSchema } from '@common/schema/workspace'
import { upsertWorkspace } from '@frontend/routes/workspaceRoutes'

type Props = {
  workspace?: WorkspaceWithEnv
  close?: () => void
}

const resolvedForm = zodResolver(upsertWorkspaceSchema)

export function ViewWorkspacePage(props: Props) {
  const { workspace } = props

  const form = useForm<WorkspaceWithEnv>({
    resolver: resolvedForm,
    defaultValues: {
      id: workspace?.id ?? '',
      name: workspace?.name ?? '',
      description: workspace?.description ?? '',
      sourceRepoUrl: workspace?.sourceRepoUrl ?? '',
      gitBranchTemplate: workspace?.gitBranchTemplate ?? '',
      customDockerfileCommands: workspace?.customDockerfileCommands ?? '',
      setupScript: workspace?.setupScript ?? '',
      postScript: workspace?.postScript ?? '',
      cacheFiles: workspace?.cacheFiles ?? [],
      envEntries: workspace?.envEntries ?? [{ key: '', value: '' }],
      createdAt: workspace?.createdAt ?? new Date(0),
      updatedAt: workspace?.updatedAt ?? new Date(0),
    },
    mode: 'onSubmit',
  })

  useEffect(() => {
    console.debug('Resetting workspace form with inbound values')
    form.reset({
      id: workspace?.id ?? '',
      name: workspace?.name ?? '',
      description: workspace?.description ?? '',
      sourceRepoUrl: workspace?.sourceRepoUrl ?? '',
      gitBranchTemplate: workspace?.gitBranchTemplate ?? '',
      customDockerfileCommands: workspace?.customDockerfileCommands ?? '',
      setupScript: workspace?.setupScript ?? '',
      postScript: workspace?.postScript ?? '',
      cacheFiles: workspace?.cacheFiles ?? [],
      envEntries: workspace?.envEntries ?? [{ key: '', value: '' }],
      createdAt: workspace?.createdAt ?? new Date(0),
      updatedAt: workspace?.updatedAt ?? new Date(0),
    })
  }, [ workspace ])

  const onSave = useCallback(async () => {
    if (!form.formState.isDirty) {
      console.debug('ViewWorkspacePage save skipped because there are no changes')
      return
    }

    await form.handleSubmit(
      (values) => upsertWorkspace(workspace?.id || '', values),
    )()
  }, [ form.formState.isDirty, workspace ])

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave,
  })

  useHotkey([ 'Control', 's' ], onSave, {
    preventDefault: true,
    blockOtherHotkeys: true,
  })

  return <Card className='w-full'>
    <header className='compact level'>
      <h1 className='text-2xl font-bold'>
        Workspace
      </h1>
      { props.close
        ? <CloseButton onClose={props.close} />
        : <></>
      }
    </header>
    <DisplayErrors
      errors={form.formState.errors.root?.message}
      className='relaxed'
    />
    <div className='relaxed'>
      <div className='compact'>
        <Input
          fullWidth
          label='Workspace name'
          placeholder='Seraphim Sandbox'
          isInvalid={Boolean(form.formState.errors.name)}
          errorMessage={form.formState.errors.name?.message}
          value={form.watch('name') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('name', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Repository URL'
          placeholder='git@github.com:org/repo.git'
          isInvalid={Boolean(form.formState.errors.sourceRepoUrl)}
          errorMessage={form.formState.errors.sourceRepoUrl?.message}
          value={form.watch('sourceRepoUrl') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('sourceRepoUrl', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Git branch template'
          placeholder='main'
          isInvalid={Boolean(form.formState.errors.gitBranchTemplate)}
          errorMessage={form.formState.errors.gitBranchTemplate?.message}
          value={form.watch('gitBranchTemplate') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitBranchTemplate', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Textarea
          label='Description'
          placeholder='Describe what this workspace is used for.'
          minRows={3}
          isInvalid={Boolean(form.formState.errors.description)}
          errorMessage={form.formState.errors.description?.message}
          value={form.watch('description') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('description', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Textarea
          label='Setup script'
          placeholder='Commands to prepare the workspace environment.'
          minRows={4}
          isInvalid={Boolean(form.formState.errors.setupScript)}
          errorMessage={form.formState.errors.setupScript?.message}
          value={form.watch('setupScript') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('setupScript', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Textarea
          label='Post script'
          placeholder='Commands to validate or build after setup.'
          minRows={4}
          isInvalid={Boolean(form.formState.errors.postScript)}
          errorMessage={form.formState.errors.postScript?.message}
          value={form.watch('postScript') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('postScript', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Textarea
          label='Custom Dockerfile commands'
          placeholder='RUN yarn install'
          minRows={4}
          isInvalid={Boolean(form.formState.errors.customDockerfileCommands)}
          errorMessage={
            form.formState.errors.customDockerfileCommands?.message
          }
          value={form.watch('customDockerfileCommands') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue(
              'customDockerfileCommands',
              value,
              { shouldDirty: true },
            )
          }}
        />
      </div>
    </div>
    <div className='level-centered'>
      <ResetButton
        onReset={() => form.reset()}
        isDirty={form.formState.isDirty}
        isDisabled={form.formState.isSubmitting}
      />
      <SaveButton
        onSave={onSave}
        isDirty={form.formState.isDirty}
        isLoading={form.formState.isSubmitting}
      />
    </div>
  </Card>
}
