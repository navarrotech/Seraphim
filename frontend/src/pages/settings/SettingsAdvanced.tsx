// Copyright © 2026 Jalapeno Labs

import type { FormEvent } from 'react'
import type { UserSettingsUpdateRequest } from '@common/schema'
import type { OnChange } from '@monaco-editor/react'

// Core
import { useEffect, useState } from 'react'

// Redux
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Form, Switch } from '@heroui/react'
import { FilePathInput } from '@frontend/common/FilePathInput'
import { Monaco } from '@frontend/common/Monaco'

// Misc
import {
  DEFAULT_CUSTOM_AGENT_INSTRUCTIONS,
  DEFAULT_CUSTOM_AGENTS_FILE,
} from '@common/constants'
import { updateCurrentUserSettings } from '@frontend/lib/routes/userRoutes'

function resolveCustomInstructions(value: string | null | undefined) {
  if (typeof value === 'string') {
    return value
  }

  console.debug('SettingsAdvanced using fallback instructions value', { value })
  return DEFAULT_CUSTOM_AGENT_INSTRUCTIONS
}

function resolveCustomAgentsFilePath(value: string | null | undefined) {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || value === undefined) {
    return DEFAULT_CUSTOM_AGENTS_FILE
  }

  console.debug('SettingsAdvanced using fallback AGENTS.md path value', { value })
  return DEFAULT_CUSTOM_AGENTS_FILE
}

function getTrimmedOptionalString(value: string): string | null {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  return trimmedValue
}

export function SettingsAdvanced() {
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)
  const [ customAgentInstructions, setCustomAgentInstructions ] = useState('')
  const [ customAgentsFilePath, setCustomAgentsFilePath ] = useState('')
  const [ useCustomAgentsFilePath, setUseCustomAgentsFilePath ] = useState(false)
  const [ isSubmitting, setIsSubmitting ] = useState(false)
  const settingsState = useSelector((reduxState) => reduxState.settings)

  const isLoading = !settingsState.hasLoaded
  const isFormDisabled = isLoading || isSubmitting

  useEffect(function syncAdvancedSettings() {
    if (!settingsState.hasLoaded) {
      console.debug('SettingsAdvanced waiting for settings to load')
      return
    }

    const resolvedCustomInstructions = resolveCustomInstructions(
      settingsState.value?.customAgentInstructions,
    )
    const resolvedCustomAgentsFilePath = resolveCustomAgentsFilePath(
      settingsState.value?.customAgentsFile,
    )

    setCustomAgentInstructions(resolvedCustomInstructions)
    setCustomAgentsFilePath(resolvedCustomAgentsFilePath)
    setUseCustomAgentsFilePath(Boolean(resolvedCustomAgentsFilePath.trim()))
  }, [ settingsState.hasLoaded, settingsState.value ])

  function handleCustomInstructionsChange(nextValue: string | undefined) {
    setStatusMessage(null)
    setCustomAgentInstructions(nextValue ?? '')
  }

  const handleMonacoChange: OnChange = function handleMonacoChange(value) {
    handleCustomInstructionsChange(value)
  }

  function handleCustomAgentsFilePathChange(nextValue: string) {
    setStatusMessage(null)
    setCustomAgentsFilePath(nextValue)
  }

  function handleUseCustomAgentsFilePathChange(isSelected: boolean) {
    setStatusMessage(null)
    setUseCustomAgentsFilePath(isSelected)

    if (!isSelected) {
      setCustomAgentsFilePath('')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage(null)
    setIsSubmitting(true)

    const requestPayload: UserSettingsUpdateRequest = {
      customAgentInstructions,
      customAgentsFile: useCustomAgentsFilePath
        ? getTrimmedOptionalString(customAgentsFilePath)
        : null,
    }

    try {
      const response = await updateCurrentUserSettings(requestPayload)
      dispatch(settingsActions.setSettings(response.settings))
      setStatusMessage('Advanced settings updated successfully.')
    }
    catch (error) {
      console.debug('SettingsAdvanced failed to update settings', { error })
      setStatusMessage('Unable to update advanced settings right now.')
    }
    finally {
      setIsSubmitting(false)
    }
  }

  let statusCard = null
  if (statusMessage) {
    statusCard = <Card className='p-4'>
      <p className='opacity-80'>{statusMessage}</p>
    </Card>
  }

  let loadingCard = null
  if (isLoading) {
    loadingCard = <Card className='p-4'>
      <p className='opacity-80'>Loading settings...</p>
    </Card>
  }

  let customAgentsFilePathInput = null
  if (useCustomAgentsFilePath) {
    customAgentsFilePathInput = <FilePathInput
      label='AGENTS.md path'
      placeholder='/home/me/AGENTS.md'
      value={customAgentsFilePath}
      isDisabled={isFormDisabled}
      onValueChange={handleCustomAgentsFilePathChange}
      className='w-full'
      description='Placeholder path input (editable text only)'
      pickType='file'
      filters={[
        { name: 'Markdown files', extensions: [ 'md', 'txt' ]},
        { name: 'All files', extensions: [ '*' ]},
      ]}
    />
  }

  return <section className='container p-6'>
    <Form onSubmit={handleSubmit} className='relaxed'>
      <div className='level w-full items-start'>
        <div className='w-full'>
          <h2 className='text-2xl'>
            <strong>Advanced settings</strong>
          </h2>
          <p className='opacity-80'>
            Define custom instructions directly or point to your own AGENTS.md file path.
          </p>
        </div>
        <div className='level-right'>
          <Button
            color='primary'
            type='submit'
            isLoading={isSubmitting}
            isDisabled={isFormDisabled}
          >
            <span>Save Settings</span>
          </Button>
        </div>
      </div>
      {loadingCard}
      <Card className='relaxed p-6 w-full'>
        <div className='relaxed'>
          <h3 className='text-xl'>Custom instructions</h3>
          <p className='opacity-80'>
            Leave blank to use default behavior, or add markdown instructions to your profile.
          </p>
        </div>
        <Monaco
          value={customAgentInstructions}
          onChange={handleMonacoChange}
          height='320px'
          fileLanguage='markdown'
          readOnly={isFormDisabled || useCustomAgentsFilePath}
        />
      </Card>
      <Card className='relaxed p-6 w-full'>
        <div className='relaxed'>
          <Switch
            isSelected={useCustomAgentsFilePath}
            isDisabled={isFormDisabled}
            onValueChange={handleUseCustomAgentsFilePathChange}
          >
            <span>Use my own AGENTS.md file</span>
          </Switch>
          <p className='opacity-80'>
            This currently stores a path only. File picker support can be improved in a follow-up.
          </p>
        </div>
        {customAgentsFilePathInput}
      </Card>
      {statusCard}
    </Form>
  </section>
}
