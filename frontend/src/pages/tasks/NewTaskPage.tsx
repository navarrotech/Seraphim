// Copyright © 2026 Jalapeno Labs

import type { TaskCreateRequest } from '@common/schema/task'

// Core
import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'
import { useNavigate } from 'react-router'
import { UrlTree } from '@common/urls'

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

  const onSave = useCallback(async () => {
    if (!form.formState.isDirty) {
      console.debug('ViewWorkspacePage save skipped because there are no changes')
      return
    }

    await form.handleSubmit(
      async (values) => {
        await createTask(values)
        navigate(UrlTree.tasks)
      },
    )()
  }, [ form.formState.isDirty ])

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave,
  })

  console.log(form.formState.errors)

  return <section className='level w-full items-start h-[90vh]'>
    <article className='relaxed w-full'>
      <Monaco
        autoFocus
        height='90vh'
        fileLanguage='markdown'
        value={form.watch('message')}
        onChange={(value) => form.setValue('message', value, formMode)}
      />
    </article>
    <article className='flex flex-col items-stretch min-w-lg max-w-lg w-full h-full'>
      <Card className='relaxed' label='Authentication'>
        <SearchAuthAccounts
          className='relaxed'
          onSelectionChange={(value) => form.setValue('gitAccountId', value.id, formMode)}
          // value={form.watch('gitAccountId')}
        />
        <SearchLlmAccounts
          className='relaxed'
          onSelectionChange={(value) => form.setValue('llmId', value.id, formMode)}
          // value={form.watch('llmId')}
        />
      </Card>
      <Card className='relaxed' label='Workspace'>
        <SearchWorkspaces
          className='relaxed'
          onSelectionChange={(value) => form.setValue('workspaceId', value.id, formMode)}
          // value={form.watch('workspaceId')}
        />
        <SearchGitBranches
          className='relaxed'
          workspaceId={form.watch('workspaceId')}
          gitAccountId={form.watch('gitAccountId')}
          onSelectionChange={(value) => form.setValue('branch', value, formMode)}
          // value={form.watch('branch')}
        />
      </Card>
      <Card className='relaxed' label='Issue (optional)'>
        <SearchIssueLinks
          className='relaxed'
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
