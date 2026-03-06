// Copyright © 2026 Jalapeno Labs

import type { TaskCreateRequest } from '@common/schema/task'

// Core
import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { getViewTaskUrl } from '@common/urls'

// Api
import { createTask } from '@frontend/routes/taskRoutes'

// UI
import { Button, Tooltip } from '@heroui/react'
import { Monaco } from '@frontend/elements/Monaco'
import { Card } from '@frontend/elements/Card'
import { SearchWorkspaces } from '@frontend/elements/SearchWorkspaces'
import { SearchGitBranches } from '@frontend/elements/SearchGitBranches'
import { SearchAuthAccounts } from '@frontend/elements/SearchAuthAccounts'
import { SearchLlmAccounts } from '@frontend/elements/SearchLlmAccounts'
import { SearchIssueTrackers } from '@frontend/elements/SearchIssueTrackers'
import { SearchIssueLinks } from '@frontend/elements/SearchIssueLinks'

// Utility
import { zodResolver } from '@hookform/resolvers/zod'
import { taskCreateSchema } from '@common/schema/task'

const resolvedForm = zodResolver(taskCreateSchema)
const formMode = {
  shouldDirty: true,
  shouldValidate: true,
  shouldTouch: true,
}

const localStorageKey = 'new-task-default-prompt'

export function NewTaskPage() {
  const navigate = useNavigate()

  const form = useForm<TaskCreateRequest>({
    resolver: resolvedForm,
    defaultValues: {
      workspaceId: '',
      gitAccountId: '',
      llmId: '',
      issueTrackingId: '',
      message: localStorage.getItem(localStorageKey) || '',
      branch: '',
      issueLink: '',
      archived: false,
    },
    mode: 'all',
  })

  useEffect(() => {
    form.trigger()

    const subscription = form.watch(async (_, info) => {
      if (!info.name) {
        return
      }

      await form.trigger(info.name)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [ form ])

  useEffect(() => {
    localStorage.setItem(
      localStorageKey,
      form.watch('message') || '',
    )
  }, [ form.watch('message') ])

  const submit = useCallback(async () => {
    await form.handleSubmit(
      async (values) => {
        const createdTask = await createTask(values)

        if (!createdTask?.task?.id) {
          console.error('Failed to create task, no task id returned', { createdTask })
          return
        }

        localStorage.removeItem(localStorageKey)

        navigate(
          getViewTaskUrl(createdTask.task.id),
        )
      },
    )()
  }, [ form.formState.isDirty ])

  const isDisabled = form.formState.isLoading || form.formState.isSubmitting

  return <section className='level w-full items-start h-[90vh]'>
    <article className='relaxed w-full'>
      <Monaco
        autoFocus
        height='90vh'
        minimapOverride
        readOnly={isDisabled}
        fileLanguage='markdown'
        value={form.watch('message')}
        onChange={(value) => form.setValue('message', value, formMode)}
      />
    </article>
    <article className='flex flex-col items-stretch min-w-lg max-w-lg w-full h-full'>
      <Card className='relaxed' label='Authentication'>
        <SearchAuthAccounts
          className='relaxed'
          isDisabled={isDisabled}
          onSelectionChange={(value) => form.setValue('gitAccountId', value.id, formMode)}
          // value={form.watch('gitAccountId')}
        />
        <SearchLlmAccounts
          className='relaxed'
          isDisabled={isDisabled}
          onSelectionChange={(value) => form.setValue('llmId', value.id, formMode)}
          // value={form.watch('llmId')}
        />
      </Card>
      <Card className='relaxed' label='Workspace'>
        <SearchWorkspaces
          className='relaxed'
          isDisabled={isDisabled}
          onSelectionChange={(value) => form.setValue('workspaceId', value.id, formMode)}
          // value={form.watch('workspaceId')}
        />
        <SearchGitBranches
          className='relaxed'
          isDisabled={isDisabled}
          workspaceId={form.watch('workspaceId')}
          gitAccountId={form.watch('gitAccountId')}
          onSelectionChange={(value) => form.setValue('branch', value, formMode)}
          // value={form.watch('branch')}
        />
      </Card>
      <Card className='relaxed' label='Issue (optional)'>
        <SearchIssueTrackers
          className='relaxed'
          isDisabled={isDisabled}
          onSelectionChange={(value) => form.setValue('issueTrackingId', value.id, formMode)}
          // value={form.watch('issueTrackingId')}
        />
        <SearchIssueLinks
          className='relaxed'
          issueTrackingId={form.watch('issueTrackingId')}
          isDisabled={isDisabled}
          onSelection={(value) => form.setValue('issueLink', value, formMode)}
          // value={form.watch('issueLink')}
        />
      </Card>

      <div className='flex-1' />

      <div>
        <Tooltip
          content={
            // @ts-ignore
            form.formState.errors['']
            || form.formState.errors?.message?.message
            || form.formState.errors?.workspaceId?.message
            || form.formState.errors?.gitAccountId?.message
            || form.formState.errors?.llmId?.message
            || form.formState.errors?.branch?.message
            || form.formState.errors?.issueLink?.message
            || 'Click to begin the task'
          }
        >
          <div>
            <Button
              id='start-task'
              fullWidth
              size='lg'
              color='primary'
              className='button'
              isLoading={form.formState.isLoading || form.formState.isSubmitting}
              isDisabled={!form.formState.isValid}
              onPress={submit}
            >
              <span>
                <strong>Begin Task</strong>
              </span>
            </Button>
          </div>
        </Tooltip>
      </div>
    </article>
  </section>
}
