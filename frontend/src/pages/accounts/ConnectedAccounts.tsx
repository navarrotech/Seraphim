// Copyright © 2026 Jalapeno Labs

import type { ConnectedAccount, OAuthProvider } from '@frontend/lib/routes/accountsRoutes'

// Core
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import {
  Button,
  Card,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from '@heroui/react'
import { SettingsTabs } from '../settings/SettingsTabs'

// Misc
import { UrlTree } from '@common/urls'
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
  const navigate = useNavigate()
  const location = useLocation()

  const [ oauthStatus, setOauthStatus ] = useState<OAuthCompletionStatus | null>(null)
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

  useEffect(() => {
    const completion = parseOAuthCompletionParams(location.search)
    if (!completion) {
      return
    }

    setOauthStatus(completion)
    navigate(UrlTree.connectedAccounts, { replace: true })

    if (completion.status === 'success') {
      void refreshAccounts()
    }
  }, [ location.search, navigate ])

  let statusBanner = null
  if (oauthStatus) {
    const banner = buildStatusBanner(oauthStatus)
    const bannerClasses = banner.tone === 'success'
      ? 'border border-emerald-500/30 bg-emerald-500/10'
      : 'border border-rose-500/30 bg-rose-500/10'

    statusBanner = <Card className={`relaxed p-4 ${bannerClasses}`}>
      <div className='text-lg'>
        <strong>{banner.title}</strong>
      </div>
      <p className='opacity-80'>{banner.message}</p>
    </Card>
  }

  async function handleConnectProvider(provider: OAuthProvider) {
    const completionRedirectUrl = buildCompletionRedirectUrl()
    if (!completionRedirectUrl) {
      console.debug('ConnectedAccounts missing completion redirect URL', {
        provider,
      })
      return
    }

    try {
      const response = await addAccount({
        provider,
        completionRedirectUrl,
      })

      if (!response.authorizationUrl) {
        console.debug('ConnectedAccounts missing OAuth authorization URL', {
          response,
        })
        return
      }

      window.open(
        response.authorizationUrl,
        '_blank',
        'noopener,noreferrer',
      )
    }
    catch (error) {
      console.debug('ConnectedAccounts failed to start OAuth flow', {
        error,
        provider,
      })
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
        provider: account.provider,
      })
    }
  }

  let content = null

  if (!accounts || accounts.length === 0) {
    content = <Card className='relaxed p-6'>
      <div className='relaxed'>
        <div className='text-xl'>No connected accounts yet.</div>
        <p className='opacity-80'>
          Link a GitHub account to sync repositories and activity.
        </p>
      </div>
    </Card>
  }
  else {
    content = <Card className='relaxed p-2'>
      <div className='grid grid-cols-12 gap-4 px-4 py-3 text-sm opacity-70'>
        <div className='col-span-5'>Account</div>
        <div className='col-span-3'>Provider</div>
        <div className='col-span-3'>Email</div>
        <div className='col-span-1 text-right'>Remove</div>
      </div>
      <div className='divide-y'>{
          accounts.map((account) =>
            <div
              key={account.id}
              className='grid grid-cols-12 items-center gap-4 px-4 py-4'
            >
              <div className='col-span-5 flex items-center gap-3'>
                <div className='h-10 w-10 overflow-hidden rounded-full border border-black/10'>{
                    account.avatarUrl
                      ? <img
                          src={account.avatarUrl}
                          alt={`${account.displayName} avatar`}
                          className='h-full w-full object-cover'
                        />
                      : <div className='flex h-full w-full items-center justify-center bg-black/5 text-sm'>
                          <span>{getAccountInitials(account)}</span>
                        </div>
                  }</div>
                <div>
                  <div className='text-lg'>{account.displayName}</div>
                  <div className='text-sm opacity-70'>@{account.username}</div>
                </div>
              </div>
              <div className='col-span-3'>
                <div className='text-sm opacity-80'>{getProviderLabel(account.provider)}</div>
              </div>
              <div className='col-span-3'>
                <div className='text-sm opacity-80'>{account.email || 'No email shared'}</div>
              </div>
              <div className='col-span-1 text-right'>
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
              </div>
            </div>,
          )
        }</div>
    </Card>
  }

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='text-2xl'>
          <strong>Connected Accounts</strong>
        </h2>
        <p className='opacity-80'>Manage GitHub connections for this workspace.</p>
      </div>
      <Dropdown placement='bottom-end'>
        <DropdownTrigger>
          <Button color='primary'>
            <span className='icon text-lg'>
              <PlusIcon />
            </span>
            <span>Add account</span>
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label='Add account'>{
            providerOptions.map((option) =>
              <DropdownItem
                key={option.provider}
                onPress={() => handleConnectProvider(option.provider)}
              >
                <span>{option.label}</span>
              </DropdownItem>,
            )
          }</DropdownMenu>
      </Dropdown>
    </div>
    <SettingsTabs />
    <div className='relaxed'>{
        statusBanner
      }{
        content
      }</div>
  </section>
}
