// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@common/types'
import type { UpdateAccountRequest } from '@common/schema/accounts'

// Core
import { useEffect } from 'react'

// Lib
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// User Interface
import { Input } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { DisplayErrors } from '@frontend/elements/DisplayErrors'
import { SaveButton } from '@frontend/elements/SaveButton'
import { ResetButton } from '@frontend/elements/ResetButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'

// Misc
import { updateAccountSchema } from '@common/schema/accounts'
import { upsertConnectedAccount } from '@frontend/routes/accountsRoutes'

type Props = {
  account?: AuthAccount
}

const resolvedForm = zodResolver(updateAccountSchema)

export function ViewGitAccountsPage(props: Props) {
  const { account } = props

  const form = useForm<UpdateAccountRequest>({
    resolver: resolvedForm,
    defaultValues: {
      name: account?.name ?? '',
      gitUserName: account?.name ?? '',
      gitUserEmail: account?.email ?? '',
      accessToken: '',
    },
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset({
      name: account?.name ?? '',
      gitUserName: account?.name ?? '',
      gitUserEmail: account?.email ?? '',
      accessToken: '',
    })
  }, [ account ])

  const onSave = form.handleSubmit(
    (values) => upsertConnectedAccount(account?.id || '', values),
  )

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave: () => onSave(),
  })

  return <article>
    <header className='compact level'>
      <h1 className='text-2xl font-bold'>
        Git Account
      </h1>
      <div className='level-right'>
        <ResetButton
          onReset={() => form.reset()}
          isDirty={form.formState.isDirty}
          isDisabled={form.formState.isSubmitting}
        />
        <SaveButton
          onSave={onSave}
          isDirty={form.formState.isDirty}
          isDisabled={form.formState.isSubmitting || !account?.id}
         />
      </div>
    </header>
    <DisplayErrors
      errors={form.formState.errors.root?.message}
      className='relaxed'
    />
    <Card>
      <div className='relaxed'>
        <Input
          label='Repository Name'
          placeholder='Seraphim Team'
          className='w-full'
          isInvalid={Boolean(form.formState.errors.name)}
          errorMessage={form.formState.errors.name?.message}
          value={form.watch('name')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('name', value, { shouldDirty: true })
          }}
        />
        <Input
          label='Git user name'
          placeholder='Ada Lovelace'
          className='w-full'
          isInvalid={Boolean(form.formState.errors.gitUserName)}
          errorMessage={form.formState.errors.gitUserName?.message}
          value={form.watch('gitUserName')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitUserName', value, { shouldDirty: true })
          }}
        />
        <Input
          label='Git user email'
          placeholder='ada@jalapenolabs.io'
          className='w-full'
          isInvalid={Boolean(form.formState.errors.gitUserEmail)}
          errorMessage={form.formState.errors.gitUserEmail?.message}
          value={form.watch('gitUserEmail')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitUserEmail', value, { shouldDirty: true })
          }}
        />
        <Input
          label='Access token'
          placeholder='ghp_***'
          type='password'
          autoComplete='off'
          className='w-full'
          isInvalid={Boolean(form.formState.errors.accessToken)}
          errorMessage={form.formState.errors.accessToken?.message}
          value={form.watch('accessToken')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('accessToken', value, { shouldDirty: true })
          }}
        />
      </div>
    </Card>
  </article>
}
