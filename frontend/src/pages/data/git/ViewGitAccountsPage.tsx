// Copyright © 2026 Jalapeno Labs

import type { GitAccount } from '@common/types'
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
import { DisplayErrors } from '@frontend/elements/buttons/DisplayErrors'
import { Information } from '@frontend/elements/Information'
import { SaveButton } from '@frontend/elements/buttons/SaveButton'
import { ResetButton } from '@frontend/elements/buttons/ResetButton'
import { CloseButton } from '@frontend/elements/buttons/CloseButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'
import { isEmpty } from 'lodash-es'

// Misc
import { upsertAccountSchema } from '@common/schema/accounts'
import { upsertGitAccount } from '@frontend/routes/accountsRoutes'
import { GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES } from '@common/constants'
import { ExternalLink } from '@frontend/elements/ExternalLink'

type Props = {
  account?: GitAccount
  provider?: GitAccount['provider']
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
      provider: account?.provider ?? provider,
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
      provider: account?.provider ?? provider,
      accessToken: '',
    })
  }, [ account ])

  useEffect(() => void form.trigger(), [])

  const onSave = useCallback(async () => {
    if (!form.formState.isDirty) {
      console.debug('ViewGitAccountPage save skipped because there are no changes')
      return false
    }

    return new Promise<boolean>(async (accept) => {
      await form.handleSubmit(
        async (values) => {
          await upsertGitAccount(account?.id || '', values)
          accept(true)
        },
        () => accept(false),
      )()
    })
  }, [ account, form.formState.isDirty ])

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave,
  })

  useHotkey([ 'Control', 's' ], onSave, {
    preventDefault: true,
    blockOtherHotkeys: true,
  })

  if (!isEmpty(form.formState.errors) || !form.formState.isValid) {
    console.debug('Form validation errors', form.formState.errors, form.formState.isValid)
  }

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
          label='Friendly Name'
          placeholder='My personal Github'
          isInvalid={Boolean(form.formState.errors.name)}
          errorMessage={form.formState.errors.name?.message}
          value={form.watch('name')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('name', value, { shouldDirty: true, shouldValidate: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Git username'
          placeholder='anakin123'
          isInvalid={Boolean(form.formState.errors.gitUserName)}
          errorMessage={form.formState.errors.gitUserName?.message}
          value={form.watch('gitUserName')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitUserName', value, { shouldDirty: true, shouldValidate: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Git real email'
          placeholder='anakin@jalapenolabs.io'
          isInvalid={Boolean(form.formState.errors.gitUserEmail)}
          errorMessage={form.formState.errors.gitUserEmail?.message}
          value={form.watch('gitUserEmail')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('gitUserEmail', value, { shouldDirty: true, shouldValidate: true })
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
          className='compact'
          isInvalid={Boolean(form.formState.errors.accessToken)}
          errorMessage={form.formState.errors.accessToken?.message}
          value={form.watch('accessToken')}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('accessToken', value, { shouldDirty: true, shouldValidate: true })
          }}
        />
        <div className='compact level-left gap-1'>
          <Information
            title='Getting the correct scopes'
            content={() => <div className='text-sm'>
              <ExternalLink href='https://github.com/settings/personal-access-tokens'>
                Get your access token here
              </ExternalLink>
              <div className='compact'>
                <p className='block mb-2'>Requirements for Github classic PAT tokens:</p>
                <ul className='list-disc list-inside mb-2'>{
                  GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES.map((scope) => <li key={scope}>{ scope }</li>)
                }</ul>
              </div>
              <div className='compact'>
                <p className='block mb-2'>Requirements for Github fine grained PAT tokens:</p>
                <ul className='list-disc list-inside mb-2'>
                  <li>Metadata:read</li>
                  <li>Email addresses:read</li>
                  <li>Content:read-write</li>
                </ul>
              </div>
              </div>
            }
            size={18}
          />
          <p className='text-sm'>Ensure you have the correct scopes</p>
        </div>
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
        onSave={async () => {
          const isSuccessful = await onSave()

          if (isSuccessful && props.close) {
            props.close()
          }
        }}
        isDirty={form.formState.isDirty}
        isDisabled={!form.formState.isValid}
        isLoading={form.formState.isSubmitting}
        text={account?.id ? 'Save' : 'Create'}
      />
    </div>
  </Card>
}
