// Copyright © 2026 Jalapeno Labs

import type { UserSettings } from '@common/types'

// Core
import { useEffect } from 'react'
import { useSelector } from '@frontend/framework/store'

// Form
import { useForm } from 'react-hook-form'
import { userSettingsUpdateFieldsSchema } from '@common/schema/userSettings'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateCurrentUserSettings } from '@frontend/routes/userRoutes'

// UI
import { Card } from '@frontend/elements/Card'
import { ThemeInput } from '@frontend/elements/ThemeInput'
import { Button } from '@heroui/react'
import { LanguageInput } from '@frontend/elements/LanguageInput'

const resolvedForm = zodResolver(userSettingsUpdateFieldsSchema)

export function GeneralSettingsPage() {
  const currentSettings = useSelector((state) => state.settings.current)

  const form = useForm<UserSettings>({
    resolver: resolvedForm,
    defaultValues: currentSettings,
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset(currentSettings)
  }, [ currentSettings ])

  const onSave = form.handleSubmit(
    (values) => updateCurrentUserSettings(values),
  )

  return <article>
    <div className='compact level'>
      <h1 className='text-2xl font-bold'>General settings</h1>
      <div className='level-right'>
        <Button
          id='reset'
          isDisabled={!form.formState.isDirty}
          onPress={() => form.reset(currentSettings)}
        >
          <span>Reset</span>
        </Button>
        <Button
          id='save'
          color='primary'
          isDisabled={!form.formState.isDirty}
          onPress={() => onSave()}
        >
          <span>Save</span>
        </Button>
      </div>
    </div>
    <Card>
      <div className='level-centered'>
        <ThemeInput
          className='w-full'
          value={form.watch('theme')}
          onChange={(value) => {
            form.setValue('theme', value, { shouldDirty: true })
          }}
        />
        <LanguageInput
          className='w-full'
          value={form.watch('language')}
          onChange={(value) => {
            form.setValue('language', value, { shouldDirty: true })
          }}
        />
      </div>
    </Card>
  </article>
}
