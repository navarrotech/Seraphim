// Copyright © 2026 Jalapeno Labs

import type { LlmWithRateLimits } from '@common/types'

// Core
import { useCallback, useEffect } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Lib
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// User Interface
import { Input, Switch } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { DisplayErrors } from '@frontend/elements/DisplayErrors'
import { SaveButton } from '@frontend/elements/SaveButton'
import { ResetButton } from '@frontend/elements/ResetButton'
import { CloseButton } from '@frontend/elements/CloseButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'

// Misc
import { upsertLlmSchema } from '@common/schema/llm'
import { upsertLlm } from '@frontend/routes/llmRoutes'

type Props = {
  languageModel?: LlmWithRateLimits
  type: LlmWithRateLimits['type']
  close?: () => void
}

const resolvedForm = zodResolver(upsertLlmSchema)

export function ViewLLMPage(props: Props) {
  const { languageModel, type } = props

  const form = useForm<LlmWithRateLimits>({
    resolver: resolvedForm,
    defaultValues: {
      id: languageModel?.id ?? '',
      userId: languageModel?.userId ?? '',
      type: languageModel?.type ?? type,
      name: languageModel?.name ?? '',
      isDefault: languageModel?.isDefault ?? false,
      preferredModel: languageModel?.preferredModel ?? '',
      apiKey: '',
      refreshToken: languageModel?.refreshToken ?? '',
      expiresAt: languageModel?.expiresAt ?? null,
      tokensUsed: languageModel?.tokensUsed ?? 0,
      tokenLimit: languageModel?.tokenLimit ?? 0,
      lastUsedAt: languageModel?.lastUsedAt ?? null,
      createdAt: languageModel?.createdAt ?? new Date(0),
      updatedAt: languageModel?.updatedAt ?? new Date(0),
      rateLimits: languageModel?.rateLimits ?? null,
    },
    mode: 'onSubmit',
  })

  useEffect(() => {
    console.debug('Resetting LLM form with inbound values')
    form.reset({
      id: languageModel?.id ?? '',
      userId: languageModel?.userId ?? '',
      type: languageModel?.type ?? type,
      name: languageModel?.name ?? '',
      isDefault: languageModel?.isDefault ?? false,
      preferredModel: languageModel?.preferredModel ?? '',
      apiKey: '',
      refreshToken: languageModel?.refreshToken ?? '',
      expiresAt: languageModel?.expiresAt ?? null,
      tokensUsed: languageModel?.tokensUsed ?? 0,
      tokenLimit: languageModel?.tokenLimit ?? 0,
      lastUsedAt: languageModel?.lastUsedAt ?? null,
      createdAt: languageModel?.createdAt ?? new Date(0),
      updatedAt: languageModel?.updatedAt ?? new Date(0),
      rateLimits: languageModel?.rateLimits ?? null,
    })
  }, [ languageModel, type ])

  const onSave = useCallback(async () => {
    if (!form.formState.isDirty) {
      console.debug('ViewLLMPage save skipped because there are no changes')
      return
    }

    await form.handleSubmit(
      (values) => upsertLlm(languageModel?.id || '', {
        ...values,
        type,
      }),
    )()
  }, [ form.formState.isDirty, languageModel, type ])

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave,
  })

  useHotkey([ 'Control', 's' ], onSave, {
    preventDefault: true,
    blockOtherHotkeys: true,
  })

  return <Card className='w-full'>
    <header className='compact level'>
      <h1 className='text-2xl font-bold'>
        LLM
      </h1>
      { props.close
        ? <CloseButton onClose={props.close} />
        : <></>
      }
    </header>
    <DisplayErrors
      errors={form.formState.errors.root?.message}
      className='relaxed'
    />
    <div className='relaxed'>
      <div className='compact'>
        <Input
          fullWidth
          label='Display name'
          placeholder='OpenAI Primary'
          isInvalid={Boolean(form.formState.errors.name)}
          errorMessage={form.formState.errors.name?.message}
          value={form.watch('name') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('name', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Preferred model'
          placeholder='gpt-4o-mini'
          isInvalid={Boolean(form.formState.errors.preferredModel)}
          errorMessage={form.formState.errors.preferredModel?.message}
          value={form.watch('preferredModel') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('preferredModel', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='API key'
          placeholder='sk-***'
          type='password'
          autoComplete='off'
          isInvalid={Boolean(form.formState.errors.apiKey)}
          errorMessage={form.formState.errors.apiKey?.message}
          value={form.watch('apiKey') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('apiKey', value, { shouldDirty: true })
          }}
        />
        <p className='text-sm opacity-80'>(Leave blank for no change)</p>
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='Token limit'
          type='number'
          min={0}
          isInvalid={Boolean(form.formState.errors.tokenLimit)}
          errorMessage={form.formState.errors.tokenLimit?.message}
          value={String(form.watch('tokenLimit') || 0)}
          onChange={(event) => {
            const value = event.currentTarget.valueAsNumber
            if (Number.isNaN(value)) {
              console.debug(
                'ViewLLMPage tokenLimit is not a number, defaulting to 0',
                { value: event.currentTarget.value },
              )
              form.setValue('tokenLimit', 0, { shouldDirty: true })
              return
            }
            form.setValue('tokenLimit', value, { shouldDirty: true })
          }}
        />
      </div>
      <div className='compact'>
        <Switch
          isSelected={Boolean(form.watch('isDefault'))}
          onValueChange={(value) => {
            form.setValue('isDefault', value, { shouldDirty: true })
          }}
        >
          Set as default LLM
        </Switch>
      </div>
    </div>
    <div className='level-centered'>
      <ResetButton
        onReset={() => form.reset()}
        isDirty={form.formState.isDirty}
        isDisabled={form.formState.isSubmitting}
      />
      <SaveButton
        onSave={onSave}
        isDirty={form.formState.isDirty}
        isLoading={form.formState.isSubmitting}
      />
    </div>
  </Card>
}
