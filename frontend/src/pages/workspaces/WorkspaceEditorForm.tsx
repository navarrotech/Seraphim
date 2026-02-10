// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'
import type { ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

// Lib
import { Controller } from 'react-hook-form'

// UI
import { Card, Input, Textarea } from '@heroui/react'
import { EnvironmentInputs } from '@frontend/common/env/EnvironmentInputs'

// Misc
import { createWorkspaceSchema } from '@frontend/lib/routes/workspaceRoutes'
import { WorkspaceDockerBuildPanel } from './WorkspaceDockerBuildPanel'
import { WorkspaceRepositoryPicker } from './WorkspaceRepositoryPicker'

export type WorkspaceFormValues = z.infer<typeof createWorkspaceSchema>

type Props = {
  form: UseFormReturn<WorkspaceFormValues>
  isFormLocked: boolean
  autoFocusWorkspaceName?: boolean
  onBuildStateChange?: (isBuilding: boolean) => void
  footer?: ReactNode
}

export function WorkspaceEditorForm(props: Props) {
  const {
    form,
    isFormLocked,
    autoFocusWorkspaceName = false,
    onBuildStateChange,
    footer,
  } = props

  return <>
    <Card className='relaxed p-4 w-full'>
      <div className='level w-full items-start'>
        <div className='w-full'>
          <input type='hidden' {...form.register('authAccountId')} />
          <input
            type='hidden'
            {...form.register('sourceRepoUrl')}
          />

          <div className='relaxed w-full'>
            <Controller
              control={form.control}
              name='name'
              render={({ field }) => (
                <Input
                  autoFocus={autoFocusWorkspaceName}
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
            <WorkspaceRepositoryPicker
              form={form}
              isDisabled={isFormLocked}
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
        render={({ field }) => (
          <WorkspaceDockerBuildPanel
            value={field.value}
            onChange={field.onChange}
            isDisabled={isFormLocked}
            onBuildStateChange={onBuildStateChange}
          />
        )}
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
    {footer}
  </>
}
