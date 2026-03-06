// Copyright © 2026 Jalapeno Labs

import type { TaskCreateRequest } from '@common/schema/task'

// Core
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'
import { useNavigate } from 'react-router'
import { UrlTree } from '@common/urls'

// UI
import { Monaco } from '@frontend/elements/Monaco'
import { Card } from '@frontend/elements/Card'
import { SearchWorkspaces } from '@frontend/elements/SearchWorkspaces'
import { SearchGitBranches } from '@frontend/elements/SearchGitBranches'
import { SearchAuthAccounts } from '@frontend/elements/SearchAuthAccounts'
import { SearchLlmAccounts } from '@frontend/elements/SearchLlmAccounts'
import { SearchIssueLinks } from '@frontend/elements/SearchIssueLinks'

// Utility
import { createTask } from '@frontend/routes/taskRoutes'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskCreateSchema } from '@common/schema/task'

const resolvedForm = zodResolver(taskCreateSchema)

export function NewTaskPage() {
  const navigate = useNavigate()

  const form = useForm<TaskCreateRequest>({
    resolver: resolvedForm,
    defaultValues: {
      workspaceId: '',
      gitAccountId: '',
      llmId: '',
      message: '',
      branch: '',
      issueLink: '',
      archived: false,
    },
    mode: 'all',
  })

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

  return <section className='level w-full items-start'>
    <div className='relaxed w-full'>
      <Monaco
        autoFocus
        height='80vh'
        fileLanguage='markdown'
        value={form.watch('message')}
        onChange={(value) => form.setValue('message', value)}
      />
    </div>
    <div className='min-w-lg max-w-lg w-full'>
      <Card className='relaxed' label='Authentication'>
        <SearchAuthAccounts
          className='relaxed'
          onSelectionChange={(value) => form.setValue('gitAccountId', value.id)}
          // value={form.watch('gitAccountId')}
        />
        <SearchLlmAccounts
          className='relaxed'
          onSelectionChange={(value) => form.setValue('llmId', value.id)}
          // value={form.watch('llmId')}
        />
      </Card>
      <Card className='relaxed' label='Workspace'>
        <SearchWorkspaces
          className='relaxed'
          onSelectionChange={(value) => form.setValue('workspaceId', value.id)}
          // value={form.watch('workspaceId')}
        />
        <SearchGitBranches
          className='relaxed'
          workspaceId={form.watch('workspaceId')}
          gitAccountId={form.watch('gitAccountId')}
          onSelectionChange={(value) => form.setValue('branch', value)}
          // value={form.watch('branch')}
        />
      </Card>
      <Card className='relaxed' label='Issue (optional)'>
        <SearchIssueLinks
          className='relaxed'
          onSelection={(value) => form.setValue('issueLink', value)}
          // value={form.watch('issueLink')}
        />
      </Card>
    </div>
  </section>
}
