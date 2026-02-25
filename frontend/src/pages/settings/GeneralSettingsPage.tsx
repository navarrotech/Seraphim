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
import { Card } from '@frontend/elements/Card'
import { ThemeInput } from '@frontend/elements/ThemeInput'
import { LanguageInput } from '@frontend/elements/LanguageInput'
import { DisplayErrors } from '@frontend/elements/DisplayErrors'
import { SaveButton } from '@frontend/elements/SaveButton'
import { ResetButton } from '@frontend/elements/ResetButton'

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
        <ResetButton
          onReset={() => form.reset(currentSettings)}
          isDirty={form.formState.isDirty}
          isDisabled={form.formState.isSubmitting}
        />
        <SaveButton
          onSave={onSave}
          isDirty={form.formState.isDirty}
          isDisabled={form.formState.isSubmitting}
        />
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
