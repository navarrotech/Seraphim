// Copyright © 2026 Jalapeno Labs

import type { Key } from 'react'
import type { AuthAccount } from '@prisma/client'
import type { AuthProvider } from '@frontend/lib/routes/accountsRoutes'

// Core
import { useEffect, useState } from 'react'

// User interface
import {
  Alert,
  Button,
  Card,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Input,
  Select,
  SelectItem,
} from '@heroui/react'

// Misc
import { GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES } from '@common/constants'

type CreateAccountPayload = {
  provider: AuthProvider
  name: string
  accessToken: string
  gitUserName: string
  gitUserEmail: string
}

type EditAccountPayload = {
  name?: string
  accessToken?: string
  gitUserEmail?: string
}

type Props = {
  isOpen: boolean
  isSubmitting: boolean
  errorMessage: string | null
  accountToEdit?: AuthAccount | null
  onOpenChange: (isOpen: boolean) => void
  onSubmitCreate: (payload: CreateAccountPayload) => Promise<void>
  onSubmitEdit: (accountId: string, payload: EditAccountPayload) => Promise<void>
}

const authProviderOptions = [
  {
    key: 'GITHUB',
    label: 'GitHub Token',
  },
] as const

function getDefaultPayload(): CreateAccountPayload {
  return {
    provider: 'GITHUB',
    name: '',
    accessToken: '',
    gitUserName: '',
    gitUserEmail: '',
  }
}

function getEditPayload(accountToEdit: AuthAccount): CreateAccountPayload {
  return {
    provider: accountToEdit.provider,
    name: accountToEdit.name,
    accessToken: '',
    gitUserName: accountToEdit.username,
    gitUserEmail: accountToEdit.email,
  }
}

export function CreateAccountDrawer(props: Props) {
  const [ payload, setPayload ] = useState<CreateAccountPayload>(getDefaultPayload)
  const [ localErrorMessage, setLocalErrorMessage ] = useState<string | null>(null)

  const isEditMode = Boolean(props.accountToEdit)

  let drawerTitle = 'Add account'
  let drawerDescription = 'Save a GitHub token and git identity for repository actions.'
  let submitButtonLabel = 'Save account'

  if (isEditMode) {
    drawerTitle = 'Edit account'
    drawerDescription = 'Update the connected account details and optional token.'
    submitButtonLabel = 'Save changes'
  }

  useEffect(function syncDrawerState() {
    if (!props.isOpen) {
      setLocalErrorMessage(null)
      return
    }

    if (props.accountToEdit) {
      setPayload(getEditPayload(props.accountToEdit))
      return
    }

    setPayload(getDefaultPayload())
  }, [ props.accountToEdit, props.isOpen ])

  function handleProviderChange(keys: 'all' | Set<Key>) {
    if (keys === 'all') {
      console.debug('CreateAccountDrawer provider selection returned all')
      return
    }

    const firstKey = Array.from(keys.values())[0]
    if (typeof firstKey !== 'string') {
      console.debug('CreateAccountDrawer provider selection key is not a string', { firstKey })
      return
    }

    if (firstKey !== 'GITHUB') {
      console.debug('CreateAccountDrawer provider selection is unsupported', { firstKey })
      return
    }

    setPayload((previousPayload) => ({
      ...previousPayload,
      provider: firstKey,
    }))
  }

  function handleNameChange(value: string) {
    setPayload((previousPayload) => ({
      ...previousPayload,
      name: value,
    }))
  }

  function handleAccessTokenChange(value: string) {
    setPayload((previousPayload) => ({
      ...previousPayload,
      accessToken: value,
    }))
  }

  function handleGitUserNameChange(value: string) {
    setPayload((previousPayload) => ({
      ...previousPayload,
      gitUserName: value,
    }))
  }

  function handleGitUserEmailChange(value: string) {
    setPayload((previousPayload) => ({
      ...previousPayload,
      gitUserEmail: value,
    }))
  }

  async function handleSubmit() {
    setLocalErrorMessage(null)

    const trimmedName = payload.name.trim()
    if (!trimmedName) {
      console.debug('CreateAccountDrawer missing account name')
      setLocalErrorMessage('Account name is required.')
      return
    }

    const trimmedGitUserEmail = payload.gitUserEmail.trim()
    if (!trimmedGitUserEmail) {
      console.debug('CreateAccountDrawer missing git user email')
      setLocalErrorMessage('Git user email is required.')
      return
    }

    if (isEditMode && props.accountToEdit) {
      const updatePayload: EditAccountPayload = {
        name: trimmedName,
        gitUserEmail: trimmedGitUserEmail,
      }

      const trimmedAccessToken = payload.accessToken.trim()
      if (trimmedAccessToken) {
        updatePayload.accessToken = trimmedAccessToken
      }

      await props.onSubmitEdit(props.accountToEdit.id, updatePayload)
      return
    }

    const trimmedAccessToken = payload.accessToken.trim()
    if (!trimmedAccessToken) {
      console.debug('CreateAccountDrawer missing access token')
      setLocalErrorMessage('GitHub token is required.')
      return
    }

    const trimmedGitUserName = payload.gitUserName.trim()
    if (!trimmedGitUserName) {
      console.debug('CreateAccountDrawer missing git user name')
      setLocalErrorMessage('Git user name is required.')
      return
    }

    await props.onSubmitCreate({
      provider: payload.provider,
      name: trimmedName,
      accessToken: trimmedAccessToken,
      gitUserName: trimmedGitUserName,
      gitUserEmail: trimmedGitUserEmail,
    })
  }

  function handleClose() {
    setLocalErrorMessage(null)
    props.onOpenChange(false)
  }

  let errorAlert = null
  const drawerErrorMessage = props.errorMessage ?? localErrorMessage

  if (drawerErrorMessage) {
    errorAlert = <Alert color='danger' className='compact'>
      <p className='opacity-80'>{drawerErrorMessage}</p>
    </Alert>
  }

  return <Drawer
    placement='right'
    isOpen={props.isOpen}
    onOpenChange={props.onOpenChange}
  >
    <DrawerContent>
      <DrawerHeader>
        <div className='relaxed'>
          <div className='text-2xl'>
            <strong>{drawerTitle}</strong>
          </div>
          <p className='opacity-80 text-sm font-light'>
            {drawerDescription}
          </p>
        </div>
      </DrawerHeader>
      <DrawerBody>
        <div className='relaxed'>
          {errorAlert}
          <Select
            className='compact'
            label='Auth provider'
            selectedKeys={new Set([ payload.provider ])}
            onSelectionChange={handleProviderChange}
            isDisabled={isEditMode}
          >
            {authProviderOptions.map((providerOption) =>
              <SelectItem key={providerOption.key}>
                {providerOption.label}
              </SelectItem>,
            )}
          </Select>
          <Input
            autoFocus
            label='Account name'
            placeholder='My personal token'
            className='compact'
            value={payload.name}
            onValueChange={handleNameChange}
          />
          <Input
            label='GitHub token'
            placeholder={
              isEditMode
                ? 'Leave empty to keep your existing token'
                : 'ghp_********'
            }
            className='compact'
            type='password'
            value={payload.accessToken}
            onValueChange={handleAccessTokenChange}
          />
          <Card className='p-3'>
            <div className='compact'>
              <p className='opacity-80'>Required token scopes</p>
              <p className='opacity-80'>
                {GITHUB_AUTH_PROVIDER_REQUIRED_SCOPES.join(', ')}
              </p>
            </div>
          </Card>
          <Input
            label='Git user name'
            placeholder='Some Name'
            className='compact'
            value={payload.gitUserName}
            onValueChange={handleGitUserNameChange}
            isDisabled={isEditMode}
          />
          <Input
            label='Git user email'
            placeholder='some@email.com'
            className='compact'
            value={payload.gitUserEmail}
            onValueChange={handleGitUserEmailChange}
          />
        </div>
      </DrawerBody>
      <DrawerFooter>
        <div className='relaxed w-full'>
          <Button
            color='primary'
            className='w-full compact'
            isLoading={props.isSubmitting}
            isDisabled={props.isSubmitting}
            onPress={handleSubmit}
          >
            <span>{submitButtonLabel}</span>
          </Button>
          <Button
            variant='light'
            className='w-full compact'
            isDisabled={props.isSubmitting}
            onPress={handleClose}
          >
            <span>Cancel</span>
          </Button>
        </div>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
}
