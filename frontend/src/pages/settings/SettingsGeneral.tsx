// Copyright © 2026 Jalapeno Labs

import type { ChangeEvent } from 'react'
import type { UserSettingsUpdateRequest } from '@common/schema'
import type { Selection } from '@react-types/shared'

// Core
import { useEffect, useRef, useState } from 'react'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// Redux
import { settingsActions } from '@frontend/framework/redux/stores/settings'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Checkbox, Form, Input, Select, SelectItem } from '@heroui/react'
import { HotkeyInput } from '@frontend/common/hotkeyInput'

// Misc
import {
  DONE_SOUND_FILE_EXTENSIONS,
  DONE_SOUND_MIME_TYPES,
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

const doneSoundAcceptList = DONE_SOUND_MIME_TYPES.join(',')
const doneSoundExtensionSummary = DONE_SOUND_FILE_EXTENSIONS.join(', ')

type SettingsFormValues = z.infer<typeof userSettingsSchema>

type SettingsPayload = {
  language: SettingsFormValues['language']
  theme: SettingsFormValues['theme']
  codeEditor: SettingsFormValues['codeEditor']
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

function resolveDoneSoundMimeType(file: File) {
  const matchedType = DONE_SOUND_MIME_TYPES.find((mimeType) => {
    return mimeType === file.type
  })
  if (matchedType) {
    return matchedType
  }

  const normalizedName = file.name.toLowerCase()
  if (normalizedName.endsWith('.mp3')) {
    return 'audio/mpeg'
  }

  if (normalizedName.endsWith('.wav')) {
    return 'audio/wav'
  }

  return null
}

function isDoneSoundFileValid(file: File): boolean {
  return Boolean(resolveDoneSoundMimeType(file))
}

function readDoneSoundFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = function onLoad() {
      const result = fileReader.result
      if (typeof result !== 'string') {
        console.debug('Done sound file reader returned a non-string result', {
          result,
        })
        reject(new Error('Done sound file reader returned invalid data'))
        return
      }

      const base64Marker = 'base64,'
      const base64Index = result.indexOf(base64Marker)
      if (base64Index === -1) {
        console.debug('Done sound file reader did not include base64 data', {
          result,
        })
        reject(new Error('Done sound file reader returned invalid data'))
        return
      }

      resolve(result.slice(base64Index + base64Marker.length))
    }

    fileReader.onerror = function onError() {
      console.debug('Done sound file reader failed', {
        error: fileReader.error,
      })
      reject(new Error('Done sound file reader failed'))
    }

    fileReader.readAsDataURL(file)
  })
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
    codeEditor: values.codeEditor,
    voiceEnabled: values.voiceEnabled,
    voiceHotkey: trimmedHotkey,
  }
}

const resolved = zodResolver(userSettingsSchema)
const defaultValues: SettingsFormValues = {
  language: DEFAULT_USER_LANGUAGE,
  theme: DEFAULT_USER_THEME,
  voiceEnabled: DEFAULT_VOICE_ENABLED,
  voiceHotkey: DEFAULT_VOICE_HOTKEY,
  doneSoundAudioFileId: null,
}

export function SettingsGeneral() {
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)
  const [ pendingDoneSoundFile, setPendingDoneSoundFile ] = useState<File | null>(null)
  const [ shouldClearDoneSoundFile, setShouldClearDoneSoundFile ] = useState(false)
  const settingsState = useSelector((reduxState) => reduxState.settings)
  const doneSoundInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<SettingsFormValues>({
    resolver: resolved,
    defaultValues,
  })

  const languageValue = form.watch('language')
  const themeValue = form.watch('theme')
  const voiceEnabledValue = form.watch('voiceEnabled')
  const voiceHotkeyValue = form.watch('voiceHotkey')
  const isDirty = form.formState.isDirty
  const isSubmitting = form.formState.isSubmitting
  const isLoading = !settingsState.hasLoaded
  const isFormDisabled = isLoading || isSubmitting
  const hasExistingDoneSound = Boolean(settingsState.value?.doneSoundAudioFileId)
  const hasPendingDoneSoundUpdate = Boolean(pendingDoneSoundFile) || shouldClearDoneSoundFile
  const isSaveDisabled = isFormDisabled || (!isDirty && !hasPendingDoneSoundUpdate)
  const isClearDoneSoundDisabled = isFormDisabled || (!hasExistingDoneSound && !pendingDoneSoundFile)

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
    const doneSoundAudioFileId = settingsState.value?.doneSoundAudioFileId ?? null
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
      doneSoundAudioFileId,
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

  function resetDoneSoundInput() {
    if (!doneSoundInputRef.current) {
      console.debug('Done sound input ref is missing while resetting')
      return
    }

    doneSoundInputRef.current.value = ''
  }

  function handleDoneSoundFileChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files
    const doneSoundFile = fileList?.[0]

    if (!doneSoundFile) {
      console.debug('Settings did not receive a done sound file')
      return
    }

    if (!isDoneSoundFileValid(doneSoundFile)) {
      console.debug('Settings rejected a done sound file due to invalid type', {
        fileName: doneSoundFile.name,
        fileType: doneSoundFile.type,
      })
      resetDoneSoundInput()
      setPendingDoneSoundFile(null)
      setShouldClearDoneSoundFile(false)
      setStatusMessage('Please choose an MP3 or WAV file for the done sound.')
      return
    }

    setStatusMessage(null)
    setPendingDoneSoundFile(doneSoundFile)
    setShouldClearDoneSoundFile(false)
  }

  function handleClearDoneSound() {
    setStatusMessage(null)
    setPendingDoneSoundFile(null)
    setShouldClearDoneSoundFile(true)
    resetDoneSoundInput()
  }

  const onSubmit = form.handleSubmit(async function onSubmit(values) {
    setStatusMessage(null)

    let settingsPayload: SettingsPayload | null = null
    if (isDirty) {
      settingsPayload = buildSettingsPayload(values)
      if (!settingsPayload) {
        setStatusMessage('Voice hotkey is required.')
        return
      }
    }

    if (!settingsPayload && !hasPendingDoneSoundUpdate) {
      console.debug('Settings submit ignored because no changes were made')
      return
    }

    const requestPayload: UserSettingsUpdateRequest = {}

    if (settingsPayload) {
      requestPayload.language = settingsPayload.language
      requestPayload.theme = settingsPayload.theme
      requestPayload.voiceEnabled = settingsPayload.voiceEnabled
      requestPayload.voiceHotkey = settingsPayload.voiceHotkey
    }

    try {
      if (pendingDoneSoundFile) {
        const doneSoundMimeType = resolveDoneSoundMimeType(pendingDoneSoundFile)
        if (!doneSoundMimeType) {
          console.debug('Settings failed to resolve a done sound mime type', {
            fileName: pendingDoneSoundFile.name,
            fileType: pendingDoneSoundFile.type,
          })
          setStatusMessage('Please choose an MP3 or WAV file for the done sound.')
          return
        }

        let doneSoundData = ''
        try {
          doneSoundData = await readDoneSoundFileAsBase64(pendingDoneSoundFile)
        }
        catch (error) {
          console.debug('Settings failed to read the done sound file', { error })
          setStatusMessage('Unable to read the done sound file.')
          return
        }

        requestPayload.doneSoundFile = {
          name: pendingDoneSoundFile.name,
          mimeType: doneSoundMimeType,
          sizeBytes: pendingDoneSoundFile.size,
          dataBase64: doneSoundData,
        }
      }

      if (shouldClearDoneSoundFile) {
        requestPayload.doneSoundFile = null
      }

      const response = await updateCurrentUserSettings(requestPayload)

      form.reset({
        ...values,
        doneSoundAudioFileId: response.settings.doneSoundAudioFileId ?? null,
      })
      setPendingDoneSoundFile(null)
      setShouldClearDoneSoundFile(false)
      resetDoneSoundInput()
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

  let doneSoundStatusMessage = `Accepted formats: ${doneSoundExtensionSummary}`
  if (pendingDoneSoundFile) {
    doneSoundStatusMessage = `Selected: ${pendingDoneSoundFile.name}`
  }
  else if (shouldClearDoneSoundFile) {
    doneSoundStatusMessage = 'Custom done sound will be removed.'
  }
  else if (hasExistingDoneSound) {
    doneSoundStatusMessage = 'Custom done sound is configured.'
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
            isDisabled={isSaveDisabled}
          >
            <span>Save Settings</span>
          </Button>
        </div>
      </div>{
        loadingCard
      }
      <Card className='relaxed p-6 w-full'>
        <div className='relaxed level w-full items-start'>
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
        <div className='w-[50%]'>
          <div className='relaxed'>
            <h3 className='text-xl'>Code editor</h3>
            <p className='opacity-80'>
              Specify the command to launch your preferred code editor from Seraphim.
            </p>
          </div>
          <Input
            label='Preferred code editor'
            value={form.watch('codeEditor') || ''}
            isDisabled={isFormDisabled}
            onChange={(event) => {
              const nextValue = event.target.value
              form.setValue('codeEditor', nextValue, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }}
            className='w-full'
          />
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
      </Card>
      <Card className='relaxed p-6 w-full'>
        <div className='level w-full items-start'>
          <div className='w-full'>
            {/* Sounds */}
            <div className='relaxed'>
              <h3 className='text-xl'>Sounds</h3>
              <p className='opacity-80'>
                Pick a custom audio clip to play when tasks finish.
              </p>
            </div>
            <div className='relaxed'>
              <Input
                ref={doneSoundInputRef}
                type='file'
                label='Done sound'
                accept={doneSoundAcceptList}
                isDisabled={isFormDisabled}
                onChange={handleDoneSoundFileChange}
                className='w-full'
              />
              <p className='opacity-80'>{
                doneSoundStatusMessage
              }</p>
            </div>
            <div className='level-right'>
              <Button
                color='danger'
                isDisabled={isClearDoneSoundDisabled}
                onPress={handleClearDoneSound}
              >
                <span>Clear custom sound</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>{
        statusCard
      }
    </Form>
  </section>
}
