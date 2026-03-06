// Copyright © 2026 Jalapeno Labs

import type { LlmWithRateLimits } from '@common/types'
import type { ViewProps } from './types'

// Core
import { useCallback, useEffect } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Lib
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// User Interface
import { Input, Switch, Autocomplete, AutocompleteItem } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { DisplayErrors } from '@frontend/elements/buttons/DisplayErrors'
import { Information } from '@frontend/elements/Information'
import { ExternalLink } from '@frontend/elements/ExternalLink'
import { SaveButton } from '@frontend/elements/buttons/SaveButton'
import { ResetButton } from '@frontend/elements/buttons/ResetButton'
import { CloseButton } from '@frontend/elements/buttons/CloseButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'
import { isEmpty } from 'lodash-es'

// Misc
import { upsertLlmSchema } from '@common/schema/llm'
import { upsertLlm } from '@frontend/routes/llmRoutes'
import { SUPPORTED_MODELS_BY_LLM } from '@common/constants'

const resolvedForm = zodResolver(upsertLlmSchema)

export function ViewDeepSeekAPILLMPage(props: ViewProps) {
  const { existingLLM } = props

  const form = useForm<LlmWithRateLimits>({
    resolver: resolvedForm,
    defaultValues: {
      id: existingLLM?.id ?? '',
      userId: existingLLM?.userId ?? '',
      type: existingLLM?.type ?? 'DEEPSEEK_API_KEY',
      name: existingLLM?.name ?? '',
      isDefault: existingLLM?.isDefault ?? props.isFirst ?? false,
      preferredModel: existingLLM?.preferredModel ?? SUPPORTED_MODELS_BY_LLM.DEEPSEEK_API_KEY?.[0] ?? '',
      apiKey: '',
      refreshToken: existingLLM?.refreshToken ?? '',
      expiresAt: existingLLM?.expiresAt ?? null,
      tokensUsed: existingLLM?.tokensUsed ?? 0,
      tokenLimit: existingLLM?.tokenLimit ?? 0,
      lastUsedAt: existingLLM?.lastUsedAt ?? null,
      createdAt: existingLLM?.createdAt ?? new Date(0),
      updatedAt: existingLLM?.updatedAt ?? new Date(0),
      rateLimits: existingLLM?.rateLimits ?? null,
    },
    mode: 'onSubmit',
  })

  useEffect(() => {
    console.debug('Resetting LLM form with inbound values')
    form.reset({
      id: existingLLM?.id ?? '',
      userId: existingLLM?.userId ?? '',
      type: existingLLM?.type ?? 'DEEPSEEK_API_KEY',
      name: existingLLM?.name ?? '',
      isDefault: existingLLM?.isDefault ?? props.isFirst ?? false,
      preferredModel: existingLLM?.preferredModel ?? SUPPORTED_MODELS_BY_LLM.DEEPSEEK_API_KEY?.[0] ?? '',
      apiKey: '',
      refreshToken: existingLLM?.refreshToken ?? '',
      expiresAt: existingLLM?.expiresAt ?? null,
      tokensUsed: existingLLM?.tokensUsed ?? 0,
      tokenLimit: existingLLM?.tokenLimit ?? 0,
      lastUsedAt: existingLLM?.lastUsedAt ?? null,
      createdAt: existingLLM?.createdAt ?? new Date(0),
      updatedAt: existingLLM?.updatedAt ?? new Date(0),
      rateLimits: existingLLM?.rateLimits ?? null,
    })
  }, [ existingLLM ])

  useEffect(() => void form.trigger(), [])

  const onSave = useCallback(async () => {
    if (!form.formState.isDirty) {
      console.debug('ViewLLMPage save skipped because there are no changes')
      return false
    }

    return new Promise<boolean>(async (accept) => {
      await form.handleSubmit(
        async (values) => {
          await upsertLlm(existingLLM?.id || '', {
            ...values,
            type: 'DEEPSEEK_API_KEY',
          })
          accept(true)
        },
        () => accept(false),
      )()
    })
  }, [ form.formState.isDirty, existingLLM ])

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave,
  })

  useHotkey([ 'Control', 's' ], onSave, {
    preventDefault: true,
    blockOtherHotkeys: true,
  })

  if (!isEmpty(form.formState.errors) || !form.formState.isValid) {
    console.debug('ViewLLMPage form is invalid', form.formState.errors, form.formState.isValid)
  }

  return <Card className='w-full'>
    <header className='compact level'>
      <h1 className='text-2xl font-bold'>
        DeepSeek API Key
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
          label='Friendly name'
          placeholder='DeepSeek Primary'
          isInvalid={Boolean(form.formState.errors.name)}
          errorMessage={form.formState.errors.name?.message}
          value={form.watch('name') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('name', value, { shouldDirty: true, shouldValidate: true })
          }}
        />
      </div>
      <div className='compact'>
        <Autocomplete
          fullWidth
          allowsCustomValue
          label='Preferred model'
          placeholder='deepseek-chat'
          isInvalid={Boolean(form.formState.errors.preferredModel)}
          errorMessage={form.formState.errors.preferredModel?.message}
          selectedKey={form.watch('preferredModel') || ''}
          onSelectionChange={(value) => {
            form.setValue('preferredModel', value as string, { shouldDirty: true, shouldValidate: true })
          }}
          >{ SUPPORTED_MODELS_BY_LLM.DEEPSEEK_API_KEY.map((model) => (
            <AutocompleteItem key={model}>{
              model
            }</AutocompleteItem>
          ))
        }</Autocomplete>
      </div>
      <div className='compact'>
        <Input
          fullWidth
          label='API key'
          placeholder='sk-***'
          type='password'
          autoComplete='off'
          className='compact'
          isInvalid={Boolean(form.formState.errors.apiKey)}
          errorMessage={form.formState.errors.apiKey?.message}
          value={form.watch('apiKey') || ''}
          onChange={(event) => {
            const value = event.currentTarget.value
            form.setValue('apiKey', value, { shouldDirty: true, shouldValidate: true })
          }}
        />
        <div className='compact level-left gap-1'>
          <Information
            title='Getting the correct scopes'
            content={() => <div className='text-sm'>
              <ExternalLink href='https://platform.deepseek.com/api_keys'>
                Get your DeepSeek API key here
              </ExternalLink>
              <div className='compact'>
                <p className='block mb-2'>Requirements for DeepSeek API keys:</p>
                <ul className='list-disc list-inside mb-2'>
                  <li>Allow model access</li>
                  <li>Allow chat completions</li>
                </ul>
              </div>
              </div>
            }
            size={18}
          />
          <p className='text-sm'>Ensure you have the correct scopes</p>
        </div>
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
              form.setValue('tokenLimit', 0, { shouldDirty: true, shouldValidate: true })
              return
            }
            form.setValue('tokenLimit', value, { shouldDirty: true, shouldValidate: true })
          }}
        />
      </div>
      <div className='compact'>
        <Switch
          isSelected={Boolean(form.watch('isDefault'))}
          onValueChange={(value) => {
            form.setValue('isDefault', value, { shouldDirty: true, shouldValidate: true })
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
        onSave={async () => {
          const isSuccessful = await onSave()

          if (isSuccessful && props.close) {
            props.close()
          }
        }}
        isDirty={form.formState.isDirty}
        isLoading={form.formState.isSubmitting}
        isDisabled={!form.formState.isValid}
      />
    </div>
  </Card>
}
