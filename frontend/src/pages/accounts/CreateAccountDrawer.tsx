// Copyright © 2026 Jalapeno Labs

import type { Key } from 'react'
import type { AuthProvider } from '@frontend/lib/routes/accountsRoutes'

// Core
import { useState } from 'react'

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

type Props = {
  isOpen: boolean
  isSubmitting: boolean
  errorMessage: string | null
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (payload: CreateAccountPayload) => Promise<void>
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

export function CreateAccountDrawer(props: Props) {
  const [ payload, setPayload ] = useState<CreateAccountPayload>(getDefaultPayload)

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
    const trimmedName = payload.name.trim()
    if (!trimmedName) {
      console.debug('CreateAccountDrawer missing account name')
      return
    }

    const trimmedAccessToken = payload.accessToken.trim()
    if (!trimmedAccessToken) {
      console.debug('CreateAccountDrawer missing access token')
      return
    }

    const trimmedGitUserName = payload.gitUserName.trim()
    if (!trimmedGitUserName) {
      console.debug('CreateAccountDrawer missing git user name')
      return
    }

    const trimmedGitUserEmail = payload.gitUserEmail.trim()
    if (!trimmedGitUserEmail) {
      console.debug('CreateAccountDrawer missing git user email')
      return
    }

    await props.onSubmit({
      provider: payload.provider,
      name: trimmedName,
      accessToken: trimmedAccessToken,
      gitUserName: trimmedGitUserName,
      gitUserEmail: trimmedGitUserEmail,
    })
  }

  function handleClose() {
    props.onOpenChange(false)
  }

  let errorAlert = null
  if (props.errorMessage) {
    errorAlert = <Alert color='danger' className='compact'>
      <p className='opacity-80'>{props.errorMessage}</p>
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
            <strong>Add account</strong>
          </div>
          <p className='opacity-80 text-sm font-light'>
            Save a GitHub token and git identity for repository actions.
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
            placeholder='ghp_********'
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
            <span>Save account</span>
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
