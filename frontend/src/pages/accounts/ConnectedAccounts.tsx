// Copyright © 2026 Jalapeno Labs

import type { AuthAccount } from '@prisma/client'
import type { UpdateConnectedAccountRequest } from '@frontend/lib/routes/accountsRoutes'

// Core
import { useState } from 'react'

// Redux
import { accountActions } from '@frontend/framework/redux/stores/accounts'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Tooltip } from '@heroui/react'
import { addToast } from '@heroui/toast'
import { CreateAccountDrawer } from './CreateAccountDrawer'

// Misc
import {
  moment,
  STANDARD_TIME_FORMAT_FULL,
  STANDARD_TIME_FORMAT_SHORT,
} from '@common/time'
import { DeleteIcon, EditBulkIcon, PlusIcon } from '@frontend/common/IconNexus'
import {
  addAccount,
  logoutAccount,
  updateConnectedAccount,
} from '@frontend/lib/routes/accountsRoutes'

type AddAccountErrorResponse = {
  error?: string
  missingScopes?: string[]
}

type AddAccountPayload = {
  provider: 'GITHUB'
  name: string
  accessToken: string
  gitUserName: string
  gitUserEmail: string
}

type ErrorWithResponse = {
  response: Response
}

function isErrorWithResponse(error: unknown): error is ErrorWithResponse {
  if (!error || typeof error !== 'object') {
    return false
  }

  if (!('response' in error)) {
    return false
  }

  const responseValue = Reflect.get(error, 'response')
  return responseValue instanceof Response
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function getAccountErrorMessage(payload: AddAccountErrorResponse) {
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }

  if (isStringArray(payload.missingScopes) && payload.missingScopes.length > 0) {
    return `GitHub token is missing required scopes: ${payload.missingScopes.join(', ')}`
  }

  return null
}

async function parseAddAccountError(error: unknown): Promise<string | null> {
  if (!isErrorWithResponse(error)) {
    console.debug('ConnectedAccounts add account failed without response payload', { error })
    return null
  }

  let responseBody: AddAccountErrorResponse | null = null
  try {
    const parsedBody = await error.response.json()
    if (typeof parsedBody === 'object' && parsedBody !== null) {
      responseBody = parsedBody
    }
  }
  catch (parseError) {
    console.debug('ConnectedAccounts failed to parse add account error response', { parseError })
  }

  if (!responseBody) {
    console.debug('ConnectedAccounts add account error response was empty')
    return null
  }

  const message = getAccountErrorMessage(responseBody)
  if (!message) {
    console.debug('ConnectedAccounts add account error response was missing message details', {
      responseBody,
    })
  }

  return message
}


function formatTimestamp(dateIso: string | Date) {
  const parsedDate = moment(dateIso)

  if (!parsedDate.isValid()) {
    console.debug('ConnectedAccounts received invalid timestamp for formatting', {
      dateIso,
    })
    return {
      short: 'Unknown',
      full: 'Unknown timestamp',
    }
  }

  return {
    short: parsedDate.format(STANDARD_TIME_FORMAT_SHORT),
    full: parsedDate.format(STANDARD_TIME_FORMAT_FULL),
  }
}

export function ConnectedAccounts() {
  const [ isDrawerOpen, setIsDrawerOpen ] = useState(false)
  const [ isSubmitting, setIsSubmitting ] = useState(false)
  const [ editingAccount, setEditingAccount ] = useState<AuthAccount | null>(null)
  const [ drawerErrorMessage, setDrawerErrorMessage ] = useState<string | null>(null)
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)
  const accounts = useSelector((reduxState) => reduxState.accounts.items)

  async function handleCreateAccount(payload: AddAccountPayload) {
    setStatusMessage(null)
    setDrawerErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await addAccount(payload)
      dispatch(
        accountActions.upsertAccount(response.account),
      )
      setIsDrawerOpen(false)
      setStatusMessage('Connected account saved successfully.')
    }
    catch (error) {
      console.debug('ConnectedAccounts failed to save account', {
        error,
      })
      const errorMessage = await parseAddAccountError(error)
      const fallbackMessage = 'Failed to save account. Verify your token and scopes.'
      const displayMessage = errorMessage ?? fallbackMessage

      setDrawerErrorMessage(displayMessage)
      setStatusMessage(displayMessage)
      addToast({
        title: 'Unable to save account',
        description: displayMessage,
        color: 'danger',
      })
    }
    finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditAccount(accountId: string, payload: UpdateConnectedAccountRequest) {
    setStatusMessage(null)
    setDrawerErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await updateConnectedAccount(accountId, payload)
      dispatch(
        accountActions.upsertAccount(response.account),
      )
      setIsDrawerOpen(false)
      setEditingAccount(null)
      setStatusMessage('Connected account updated successfully.')
    }
    catch (error) {
      console.debug('ConnectedAccounts failed to update account', {
        error,
        accountId,
      })
      const errorMessage = await parseAddAccountError(error)
      const fallbackMessage = 'Failed to update account. Verify your values and token.'
      const displayMessage = errorMessage ?? fallbackMessage

      setDrawerErrorMessage(displayMessage)
      setStatusMessage(displayMessage)
      addToast({
        title: 'Unable to update account',
        description: displayMessage,
        color: 'danger',
      })
    }
    finally {
      setIsSubmitting(false)
    }
  }

  async function handleDisconnectAccount(account: AuthAccount) {
    try {
      await logoutAccount({
        provider: account.provider,
        accountId: account.id,
      })
      dispatch(
        accountActions.removeAccount({ id: account.id }),
      )
      setStatusMessage('Connected account removed successfully.')
    }
    catch (error) {
      console.debug('AuthAccounts failed to disconnect account', {
        error,
        accountId: account.id,
      })
    }
  }

  function handleEditAccountClick(account: AuthAccount) {
    setDrawerErrorMessage(null)
    setEditingAccount(account)
    setIsDrawerOpen(true)
  }

  function handleAddAccountClick() {
    setDrawerErrorMessage(null)
    setEditingAccount(null)
    setIsDrawerOpen(true)
  }

  function handleDrawerOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDrawerErrorMessage(null)
      setEditingAccount(null)
    }
    setIsDrawerOpen(nextOpen)
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
      <div className='grid grid-cols-14 gap-4 px-4 py-3 text-sm opacity-70'>
        <div className='col-span-2'>Account</div>
        <div className='col-span-2'>GitHub user</div>
        <div className='col-span-3'>Email</div>
        <div className='col-span-2'>Token</div>
        <div className='col-span-2'>Created at</div>
        <div className='col-span-2'>Updated at</div>
        <div className='col-span-1 text-right'>Actions</div>
      </div>
      <div className='divide-y'>
        {accounts.map((account) => {
          const createdAt = formatTimestamp(account.createdAt)
          const updatedAt = formatTimestamp(account.updatedAt)

          return <div
            key={account.id}
            className='grid grid-cols-14 items-center gap-4 px-4 py-4'
          >
            <div className='col-span-2'>
              <div className='text-lg'>{account.name}</div>
            </div>
            <div className='col-span-2'>
              <div className='text-sm opacity-80'>@{account.username}</div>
            </div>
            <div className='col-span-3'>
              <div className='text-sm opacity-80'>{account.email}</div>
            </div>
            <div className='col-span-2'>
              <div className='text-sm opacity-80'>{account.accessToken}</div>
            </div>
            <div className='col-span-2'>
              <Tooltip content={createdAt.full}>
                <div className='text-sm opacity-80 w-fit'>{createdAt.short}</div>
              </Tooltip>
            </div>
            <div className='col-span-2'>
              <Tooltip content={updatedAt.full}>
                <div className='text-sm opacity-80 w-fit'>{updatedAt.short}</div>
              </Tooltip>
            </div>
            <div className='col-span-1 text-right'>
              <div className='level-right gap-2'>
                <Tooltip content='Edit account'>
                  <Button
                    isIconOnly
                    variant='light'
                    onPress={() => handleEditAccountClick(account)}
                  >
                    <span className='icon'>
                      <EditBulkIcon />
                    </span>
                  </Button>
                </Tooltip>
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
            </div>
          </div>
        })}
      </div>
    </Card>
  }

  return <section>
    <div className='level relaxed'>
      <div>
        <h2 className='text-2xl'>
          <strong>Connected Accounts</strong>
        </h2>
        <p className='opacity-80'>Manage token-based GitHub accounts.</p>
      </div>
      <Button
        color='primary'
        onPress={handleAddAccountClick}
      >
        <span className='icon text-lg'>
          <PlusIcon />
        </span>
        <span>Add account</span>
      </Button>
    </div>
    <div className='relaxed'>
      {statusCard}
      {content}
    </div>
    <CreateAccountDrawer
      isOpen={isDrawerOpen}
      isSubmitting={isSubmitting}
      errorMessage={drawerErrorMessage}
      accountToEdit={editingAccount}
      onOpenChange={handleDrawerOpenChange}
      onSubmitCreate={handleCreateAccount}
      onSubmitEdit={handleEditAccount}
    />
  </section>
}
