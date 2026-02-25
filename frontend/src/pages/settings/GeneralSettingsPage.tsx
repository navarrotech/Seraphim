// Copyright © 2026 Jalapeno Labs

import type { UserSettings } from '@common/types'

// Core
import { useEffect } from 'react'
import { useSelector } from '@frontend/framework/store'
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'

// Form
import { useForm } from 'react-hook-form'
import { userSettingsUpdateFieldsSchema } from '@common/schema/userSettings'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateCurrentUserSettings } from '@frontend/routes/userRoutes'

// UI
import { Button, Tooltip } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { ThemeInput } from '@frontend/elements/ThemeInput'
import { LanguageInput } from '@frontend/elements/LanguageInput'
import { DisplayErrors } from '@frontend/elements/DisplayErrors'

// Iconography
import { ResetIcon } from '@frontend/elements/graphics/IconNexus'

const resolvedForm = zodResolver(userSettingsUpdateFieldsSchema)

export function GeneralSettingsPage() {
  // Inputs:
  const currentSettings = useSelector((state) => state.settings.current)

  // State:
  const form = useForm<UserSettings>({
    resolver: resolvedForm,
    defaultValues: currentSettings,
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset(currentSettings)
  }, [ currentSettings ])

  // Actions:
  const onSave = form.handleSubmit(
    (values) => updateCurrentUserSettings(values),
  )

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave: () => onSave(),
  })

  return <article>
    <header className='compact level'>
      <h1 className='text-2xl font-bold'>General settings</h1>
      <div className='level-right'>
        <Tooltip content='Undo your unsaved changes'>
          <Button
            id='reset'
            isDisabled={!form.formState.isDirty}
            onPress={() => form.reset(currentSettings)}
          >
            <span className='icon'>
              <ResetIcon />
            </span>
            <span>Reset</span>
          </Button>
        </Tooltip>
        <Tooltip content={form.formState.isDirty
            ? 'Save your changes'
            : 'No unsaved changes to save'
          }>
          <div>
            <Button
              id='save'
              color='primary'
              isDisabled={!form.formState.isDirty}
              onPress={() => onSave()}
            >
              <span>Save</span>
            </Button>
          </div>
        </Tooltip>
      </div>
    </header>
    <DisplayErrors
      // @ts-ignore
      errors={form.formState.errors['']?.message}
      className='relaxed'
    />
    <Card>
      <div className='level-centered'>
        <ThemeInput
          className='w-full'
          value={form.watch('theme')}
          onChange={(value) => {
            form.setValue('theme', value, { shouldDirty: true })
          }}
          errorMessage={form.formState.errors.theme?.message}
        />
        <LanguageInput
          className='w-full'
          value={form.watch('language')}
          onChange={(value) => {
            form.setValue('language', value, { shouldDirty: true })
          }}
          errorMessage={form.formState.errors.language?.message}
        />
      </div>
    </Card>
  </article>
}
