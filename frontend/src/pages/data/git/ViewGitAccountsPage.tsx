// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@common/types'
import type { UpsertAccountRequest } from '@common/schema/accounts'

// Core
import { useCallback, useEffect } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Lib
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// User Interface
import { Input } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { DisplayErrors } from '@frontend/elements/DisplayErrors'
import { SaveButton } from '@frontend/elements/SaveButton'
import { ResetButton } from '@frontend/elements/ResetButton'
import { CloseButton } from '@frontend/elements/CloseButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'

// Misc
import { upsertAccountSchema } from '@common/schema/accounts'
import { upsertGitAccount } from '@frontend/routes/accountsRoutes'

type Props = {
  account?: AuthAccount
  provider?: AuthAccount['provider']
  close?: () => void
}

const resolvedForm = zodResolver(upsertAccountSchema)

export function ViewGitAccountsPage(props: Props) {
  const { account, provider } = props

  const form = useForm<UpsertAccountRequest>({
    resolver: resolvedForm,
    defaultValues: {
      name: account?.name ?? '',
      gitUserName: account?.username ?? '',
      gitUserEmail: account?.email ?? '',
      provider: account.provider ?? provider,
      accessToken: '',
    },
    mode: 'onSubmit',
  })

  useEffect(() => {
    console.debug('Resetting form with inbound values from the form')
    form.reset({
      name: account?.name ?? '',
      gitUserName: account?.username ?? '',
      gitUserEmail: account?.email ?? '',
      provider: account.provider ?? provider,
      accessToken: '',
    })
  }, [ account ])

  const onSave = useCallback(async () => {
    if (!form.formState.isDirty) {
      return
    }

    await form.handleSubmit(
      (values) => upsertGitAccount(account?.id || '', values),
    )()
  }, [ account, form.formState.isDirty ])

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
        Git Account
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
          label='Repository Name'
          placeholder='Seraphim Team'
          isInvalid={Boolean(form.formState.errors.name)}
          errorMessage={form.formState.errors.name?.message}
          value={form.watch('name')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('name', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Git real name'
          placeholder='Ada Lovelace'
          isInvalid={Boolean(form.formState.errors.gitUserName)}
          errorMessage={form.formState.errors.gitUserName?.message}
          value={form.watch('gitUserName')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitUserName', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Git real email'
          placeholder='ada@jalapenolabs.io'
          isInvalid={Boolean(form.formState.errors.gitUserEmail)}
          errorMessage={form.formState.errors.gitUserEmail?.message}
          value={form.watch('gitUserEmail')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitUserEmail', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          label='Access token'
          placeholder='ghp_***'
          fullWidth
          type='password'
          autoComplete='off'
          isInvalid={Boolean(form.formState.errors.accessToken)}
          errorMessage={form.formState.errors.accessToken?.message}
          value={form.watch('accessToken')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('accessToken', value, { shouldDirty: true })
          }}
        />
        <p className='text-sm opacity-80'>(Leave blank for no change)</p>
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
        isDisabled={!account?.id}
        isLoading={form.formState.isSubmitting}
      />
    </div>
  </Card>
}
