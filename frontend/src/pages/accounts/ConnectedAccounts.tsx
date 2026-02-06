// Copyright © 2026 Jalapeno Labs

import type { ConnectedAccount } from '@frontend/lib/routes/accountsRoutes'

// Core
import { useEffect, useState } from 'react'

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Tooltip } from '@heroui/react'
import { SettingsTabs } from '../settings/SettingsTabs'
import { CreateAccountDrawer } from './CreateAccountDrawer'

// Misc
import { DeleteIcon, PlusIcon } from '@frontend/common/IconNexus'
import {
  addAccount,
  listAccounts,
  logoutAccount,
} from '@frontend/lib/routes/accountsRoutes'

type OAuthCompletionStatus = {
  provider: OAuthProvider
  status: 'success' | 'error'
  accountId?: string
  error?: string
}

type StatusBanner = {
  title: string
  message: string
  tone: 'success' | 'error'
}

const providerLabels: Record<OAuthProvider, string> = {
  GITHUB: 'GitHub',
}

const providerOptions = [
  {
    provider: 'GITHUB',
    label: 'Add GitHub account',
  },
] as const

function getProviderLabel(provider: OAuthProvider) {
  return providerLabels[provider] || provider
}

function getAccountInitials(account: ConnectedAccount) {
  const displayName = account.displayName.trim()
  if (displayName) {
    return displayName.slice(0, 1).toUpperCase()
  }

  const username = account.username.trim()
  if (username) {
    return username.slice(0, 1).toUpperCase()
  }

  return '?'
}

function buildCompletionRedirectUrl() {
  if (!window?.location?.origin) {
    console.debug('ConnectedAccounts missing window origin for OAuth redirect')
    return null
  }

  return new URL(
    UrlTree.connectedAccounts,
    window.location.origin,
  ).toString()
}

function parseOAuthCompletionParams(
  search: string,
): OAuthCompletionStatus | null {
  if (!search || search.trim().length === 0) {
    return null
  }

  const parameters = new URLSearchParams(search)
  const provider = parameters.get('provider')
  const status = parameters.get('status')

  if (!provider || !status) {
    return null
  }

  if (provider !== 'GITHUB') {
    console.debug('ConnectedAccounts received unsupported OAuth provider', {
      provider,
    })
    return null
  }

  if (status !== 'success' && status !== 'error') {
    console.debug('ConnectedAccounts received invalid OAuth status', {
      status,
    })
    return null
  }

  return {
    provider,
    status,
    accountId: parameters.get('accountId') || undefined,
    error: parameters.get('error') || undefined,
  }
}

function buildStatusBanner(status: OAuthCompletionStatus): StatusBanner {
  const providerLabel = getProviderLabel(status.provider)

  if (status.status === 'success') {
    return {
      title: `${providerLabel} connected`,
      message: `Your ${providerLabel} account is ready to use.`,
      tone: 'success',
    }
  }

  return {
    title: `${providerLabel} llm failed`,
    message: status.error || 'Please try again.',
    tone: 'error',
  }
}

export function ConnectedAccounts() {
  const [ isDrawerOpen, setIsDrawerOpen ] = useState(false)
  const [ isSubmitting, setIsSubmitting ] = useState(false)
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)
  const accounts = useSelector((reduxState) => reduxState.accounts.items)

  async function refreshAccounts() {
    try {
      const response = await listAccounts()

      dispatch(
        accountActions.setAccounts(response.accounts),
      )
    }
    catch (error) {
      console.debug('ConnectedAccounts failed to refresh accounts', { error })
    }
  }

  useEffect(function loadAccountsOnMount() {
    void refreshAccounts()
  }, [])

  async function handleCreateAccount(payload: {
    provider: 'GITHUB'
    name: string
    accessToken: string
    gitUserName: string
    gitUserEmail: string
  }) {
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      await addAccount(payload)
      setIsDrawerOpen(false)
      await refreshAccounts()
      setStatusMessage('Account saved successfully.')
    }
    catch (error) {
      console.debug('ConnectedAccounts failed to save account', {
        error,
      })
      setStatusMessage('Failed to save account. Verify your token and scopes.')
    }
    finally {
      setIsSubmitting(false)
    }
  }

  async function handleDisconnectAccount(account: ConnectedAccount) {
    try {
      await logoutAccount({
        provider: account.provider,
        accountId: account.id,
      })
      await refreshAccounts()
    }
    catch (error) {
      console.debug('ConnectedAccounts failed to disconnect account', {
        error,
        accountId: account.id,
      })
    }
  }

  let statusCard = null
  if (statusMessage) {
    statusCard = <Card className='relaxed p-4'>
      <p className='opacity-80'>{statusMessage}</p>
    </Card>
  }

  let content = null
  if (!accounts || accounts.length === 0) {
    content = <Card className='relaxed p-6'>
      <div className='relaxed'>
        <div className='text-xl'>No connected accounts yet.</div>
        <p className='opacity-80'>
          Add a GitHub token account to sync repositories and activity.
        </p>
      </div>
    </Card>
  }
  else {
    content = <Card className='relaxed p-2'>
      <div className='grid grid-cols-12 gap-4 px-4 py-3 text-sm opacity-70'>
        <div className='col-span-3'>Account</div>
        <div className='col-span-2'>Provider</div>
        <div className='col-span-2'>GitHub user</div>
        <div className='col-span-2'>Email</div>
        <div className='col-span-2'>Token</div>
        <div className='col-span-1 text-right'>Remove</div>
      </div>
      <div className='divide-y'>
        {accounts.map((account) =>
          <div
            key={account.id}
            className='grid grid-cols-12 items-center gap-4 px-4 py-4'
          >
            <div className='col-span-3'>
              <div className='text-lg'>{account.name}</div>
            </div>
            <div className='col-span-2'>
              <div className='text-sm opacity-80'>{account.provider}</div>
            </div>
            <div className='col-span-2'>
              <div className='text-sm opacity-80'>@{account.username}</div>
            </div>
            <div className='col-span-2'>
              <div className='text-sm opacity-80'>{account.email}</div>
            </div>
            <div className='col-span-2'>
              <div className='text-sm opacity-80'>{account.tokenPreview}</div>
            </div>
            <div className='col-span-1 text-right'>
              <Tooltip content='Remove account'>
                <Button
                  isIconOnly
                  variant='light'
                  color='danger'
                  onPress={() => handleDisconnectAccount(account)}
                >
                  <span className='icon'>
                    <DeleteIcon />
                  </span>
                </Button>
              </Tooltip>
            </div>
          </div>,
        )}
      </div>
    </Card>
  }

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='text-2xl'>
          <strong>Connected Accounts</strong>
        </h2>
        <p className='opacity-80'>Manage token-based GitHub accounts.</p>
      </div>
      <Button
        color='primary'
        onPress={() => setIsDrawerOpen(true)}
      >
        <span className='icon text-lg'>
          <PlusIcon />
        </span>
        <span>Add account</span>
      </Button>
    </div>
    <SettingsTabs />
    <div className='relaxed'>
      {statusCard}
      {content}
    </div>
    <CreateAccountDrawer
      isOpen={isDrawerOpen}
      isSubmitting={isSubmitting}
      onOpenChange={setIsDrawerOpen}
      onSubmit={handleCreateAccount}
    />
  </section>
}
