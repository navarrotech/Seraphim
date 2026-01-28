// Copyright © 2026 Jalapeno Labs

import type { Selection } from '@react-types/shared'

// Core
import { useEffect, useState } from 'react'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// Redux
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Checkbox, Form, Select, SelectItem } from '@heroui/react'
import { HotkeyInput } from '@frontend/common/hotkeyInput'
import { SettingsTabs } from './settings/SettingsTabs'

// Misc
import {
  DEFAULT_USER_LANGUAGE,
  DEFAULT_USER_THEME,
  DEFAULT_VOICE_ENABLED,
  DEFAULT_VOICE_HOTKEY,
  USER_LANGUAGE_OPTIONS,
  USER_THEME_OPTIONS,
} from '@common/constants'
import {
  userLanguageSchema,
  userSettingsSchema,
  userThemeSchema,
} from '@common/schema'
import { updateCurrentUserSettings } from '@frontend/lib/routes/userRoutes'

const languageOptionLabels = {
  'auto': 'Auto',
  'en-US': 'English (US)',
} as const

const themeOptionLabels = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
} as const

type SettingsFormValues = z.infer<typeof userSettingsSchema>

type SettingsPayload = {
  language: SettingsFormValues['language']
  theme: SettingsFormValues['theme']
  voiceEnabled: boolean
  voiceHotkey: string
}

function resolveSelection<OptionType extends string>(
  selection: Selection,
  schema: z.ZodEnum<[OptionType, ...OptionType[]]>,
  context: string,
): OptionType | null {
  if (selection === 'all') {
    console.debug('Settings received an unexpected selection', {
      context,
      selection,
    })
    return null
  }

  const selectedKeys = Array.from(selection)
  const selectedKey = selectedKeys[0]

  if (!selectedKey) {
    console.debug('Settings failed to resolve a selection', {
      context,
      selection,
    })
    return null
  }

  if (typeof selectedKey !== 'string') {
    console.debug('Settings expected a string selection key', {
      context,
      selection,
    })
    return null
  }

  const parsedSelection = schema.safeParse(selectedKey)
  if (!parsedSelection.success) {
    console.debug('Settings received an unknown selection value', {
      context,
      selection,
    })
    return null
  }

  return parsedSelection.data
}

function resolveSettingValue<OptionType extends string>(
  value: unknown,
  schema: z.ZodEnum<[OptionType, ...OptionType[]]>,
  fallback: OptionType,
  context: string,
): OptionType {
  const parsedValue = schema.safeParse(value)
  if (!parsedValue.success) {
    console.debug('Settings received an unknown stored value', {
      context,
      value,
    })
    return fallback
  }

  return parsedValue.data
}

function buildSettingsPayload(values: SettingsFormValues): SettingsPayload | null {
  const trimmedHotkey = values.voiceHotkey.trim()
  if (!trimmedHotkey) {
    console.debug('Settings cannot save with an empty hotkey', { values })
    return null
  }

  return {
    language: values.language,
    theme: values.theme,
    voiceEnabled: values.voiceEnabled,
    voiceHotkey: trimmedHotkey,
  }
}

export function Settings() {
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)
  const settingsState = useSelector((reduxState) => reduxState.settings)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      language: DEFAULT_USER_LANGUAGE,
      theme: DEFAULT_USER_THEME,
      voiceEnabled: DEFAULT_VOICE_ENABLED,
      voiceHotkey: DEFAULT_VOICE_HOTKEY,
    },
  })

  const languageValue = form.watch('language')
  const themeValue = form.watch('theme')
  const voiceEnabledValue = form.watch('voiceEnabled')
  const voiceHotkeyValue = form.watch('voiceHotkey')
  const isDirty = form.formState.isDirty
  const isSubmitting = form.formState.isSubmitting
  const isLoading = !settingsState.hasLoaded
  const isFormDisabled = isLoading || isSubmitting

  const languageKeys = languageValue
    ? [ languageValue ]
    : []

  const themeKeys = themeValue
    ? [ themeValue ]
    : []

  useEffect(function syncUserSettings() {
    if (!settingsState.hasLoaded) {
      console.debug('Settings waiting for user settings to load')
      return
    }

    if (isDirty) {
      console.debug('Settings form is dirty, skipping reset', {
        hasSettings: Boolean(settingsState.value),
      })
      return
    }

    const language = resolveSettingValue(
      settingsState.value?.language,
      userLanguageSchema,
      DEFAULT_USER_LANGUAGE,
      'language',
    )
    const theme = resolveSettingValue(
      settingsState.value?.theme,
      userThemeSchema,
      DEFAULT_USER_THEME,
      'theme',
    )
    const voiceEnabled = settingsState.value?.voiceEnabled ?? DEFAULT_VOICE_ENABLED
    const voiceHotkey = settingsState.value?.voiceHotkey || DEFAULT_VOICE_HOTKEY
    if (!settingsState.value) {
      console.debug(
        'Settings falling back to defaults because settings are missing',
        { hasSettings: false },
      )
    }

    form.reset({
      language,
      theme,
      voiceEnabled,
      voiceHotkey,
    })
  }, [ form, isDirty, settingsState.hasLoaded, settingsState.value ])

  function handleLanguageSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(
      selection,
      userLanguageSchema,
      'language',
    )
    if (!resolvedSelection) {
      return
    }

    setStatusMessage(null)
    form.setValue('language', resolvedSelection, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function handleThemeSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(
      selection,
      userThemeSchema,
      'theme',
    )
    if (!resolvedSelection) {
      return
    }

    setStatusMessage(null)
    form.setValue('theme', resolvedSelection, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function handleVoiceEnabledChange(isSelected: boolean) {
    setStatusMessage(null)
    form.setValue('voiceEnabled', isSelected, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function handleHotkeyChange(nextValue: string) {
    if (!nextValue) {
      console.debug('Settings received an empty hotkey update')
      return
    }

    setStatusMessage(null)
    form.setValue('voiceHotkey', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const onSubmit = form.handleSubmit(async function onSubmit(values) {
    setStatusMessage(null)

    if (!isDirty) {
      console.debug('Settings submit ignored because no changes were made')
      return
    }

    const payload = buildSettingsPayload(values)
    if (!payload) {
      setStatusMessage('Voice hotkey is required.')
      return
    }

    try {
      const response = await updateCurrentUserSettings(payload)

      form.reset({
        ...values,
      })
      dispatch(
        settingsActions.setSettings(response.settings),
      )
      setStatusMessage('Settings updated successfully.')
    }
    catch (error) {
      console.debug('Settings failed to update', { error })
      setStatusMessage('Unable to update settings right now.')
    }
  })

  let statusCard = null
  if (statusMessage) {
    statusCard = <Card className='p-4'>
      <p className='opacity-80'>{
        statusMessage
      }</p>
    </Card>
  }

  let loadingCard = null
  if (isLoading) {
    loadingCard = <Card className='p-4'>
      <p className='opacity-80'>Loading settings...</p>
    </Card>
  }

  return <section className='container p-6'>
    <Form onSubmit={onSubmit} className='relaxed'>
      <div className='level w-full items-start'>
        <div className='w-full'>
          <h2 className='text-2xl'>
            <strong>Settings</strong>
          </h2>
          <p className='opacity-80'>
            Choose how Seraphim should look and which language to prioritize.
          </p>
        </div>
        <div className='level-right'>
          <Button
            color='primary'
            type='submit'
            isLoading={isSubmitting}
            isDisabled={isFormDisabled || !isDirty}
          >
            <span>Save Settings</span>
          </Button>
        </div>
      </div>{
        <SettingsTabs />
      }{
        loadingCard
      }
      <Card className='relaxed p-6 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
            {/* Language */}
            <div className='relaxed'>
              <h3 className='text-xl'>Language</h3>
              <p className='opacity-80'>
                Auto detects your system locale or picks a specific language.
              </p>
            </div>
            <Select
              label='Language'
              placeholder='Select language'
              selectedKeys={languageKeys}
              onSelectionChange={handleLanguageSelection}
              isDisabled={isFormDisabled}
              className='w-full'
            >{
              USER_LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option}>{
                  languageOptionLabels[option]
                }</SelectItem>
              ))
            }</Select>
          </div>
          <div className='w-full'>
            {/* Theme */}
            <div className='relaxed'>
              <h3 className='text-xl'>Theme</h3>
              <p className='opacity-80'>
                Match your system or lock the interface to light or dark.
              </p>
            </div>
            <Select
              label='Theme'
              placeholder='Select theme'
              selectedKeys={themeKeys}
              onSelectionChange={handleThemeSelection}
              isDisabled={isFormDisabled}
              className='w-full'
            >{
              USER_THEME_OPTIONS.map((option) => (
                <SelectItem key={option}>{
                  themeOptionLabels[option]
                }</SelectItem>
              ))
            }</Select>
          </div>
        </div>
      </Card>
      <Card className='relaxed p-6 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
            {/* Voice */}
            <div className='relaxed'>
              <h3 className='text-xl'>Voice</h3>
              <p className='opacity-80'>
                Control the voice capture options used for transcription.
              </p>
            </div>
            <div className='relaxed'>
              <Checkbox
                isSelected={voiceEnabledValue}
                isDisabled={isFormDisabled}
                onValueChange={handleVoiceEnabledChange}
              >{
                'Voice features enabled'
              }</Checkbox>
            </div>
            <HotkeyInput
              label='Voice hotkey'
              value={voiceHotkeyValue}
              isDisabled={isFormDisabled || !voiceEnabledValue}
              onChange={handleHotkeyChange}
            />
          </div>
        </div>
      </Card>{
        statusCard
      }
    </Form>
  </section>
}
