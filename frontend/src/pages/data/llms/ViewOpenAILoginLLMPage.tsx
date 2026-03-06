// Copyright © 2026 Jalapeno Labs

import type { CodexAuthJson, LlmWithRateLimits } from '@common/types'
import type { ViewProps } from './types'

// Core
import { useCallback, useEffect, useMemo } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Lib
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// User Interface
import { Input, Switch, Autocomplete, AutocompleteItem, Alert } from '@heroui/react'
import { Card } from '@frontend/elements/Card'
import { Monaco } from '@frontend/elements/Monaco'
import { DisplayErrors } from '@frontend/elements/buttons/DisplayErrors'
import { Information } from '@frontend/elements/Information'
import { SaveButton } from '@frontend/elements/buttons/SaveButton'
import { ResetButton } from '@frontend/elements/buttons/ResetButton'
import { CloseButton } from '@frontend/elements/buttons/CloseButton'

// Utility
import { useWatchUnsavedWork } from '@frontend/hooks/useWatchUnsavedWork'
import { safeParseJson } from '@common/json'
import { isEmpty } from 'lodash-es'

// Misc
import { upsertLlmSchema } from '@common/schema/llm'
import { upsertLlm } from '@frontend/routes/llmRoutes'
import { SUPPORTED_MODELS_BY_LLM } from '@common/constants'

const resolvedForm = zodResolver(upsertLlmSchema)

export function ViewOpenAiLoginLLMPage(props: ViewProps) {
  const { existingLLM } = props
  const isCreateMode = !existingLLM?.id

  const form = useForm<LlmWithRateLimits>({
    resolver: resolvedForm,
    defaultValues: {
      id: existingLLM?.id ?? '',
      userId: existingLLM?.userId ?? '',
      type: existingLLM?.type ?? 'OPENAI_LOGIN_TOKEN',
      name: existingLLM?.name ?? '',
      isDefault: existingLLM?.isDefault ?? props.isFirst ?? false,
      preferredModel: existingLLM?.preferredModel ?? SUPPORTED_MODELS_BY_LLM.OPENAI_LOGIN_TOKEN[0] ?? '',
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
      type: existingLLM?.type ?? 'OPENAI_LOGIN_TOKEN',
      name: existingLLM?.name ?? '',
      isDefault: existingLLM?.isDefault ?? props.isFirst ?? false,
      preferredModel: existingLLM?.preferredModel ?? SUPPORTED_MODELS_BY_LLM.OPENAI_LOGIN_TOKEN[0] ?? '',
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
            type: 'OPENAI_LOGIN_TOKEN',
          })
          accept(true)
        },
        () => accept(false),
      )()
    })
  }, [ form.formState.isDirty, existingLLM ])

  const onSaveAndCloseIfCreate = useCallback(async () => {
    const isSuccessful = await onSave()

    if (isSuccessful && isCreateMode && props.close) {
      props.close()
    }
  }, [ onSave, isCreateMode, props.close ])

  useWatchUnsavedWork(form.formState.isDirty, {
    onSave,
  })

  useHotkey([ 'Control', 's' ], onSave, {
    preventDefault: true,
    blockOtherHotkeys: true,
    enabled: !isCreateMode,
  })

  useHotkey([ 'Control', 'Enter' ], onSaveAndCloseIfCreate, {
    preventDefault: true,
    blockOtherHotkeys: true,
    enabled: isCreateMode,
  })

  const tokenErrorMessage = useJsonTokenValidityChecker(
    form.watch('apiKey') || '',
    form.formState.errors.apiKey?.message,
    !Boolean(props.existingLLM?.id),
  )

  if (!isEmpty(form.formState.errors) || !form.formState.isValid) {
    console.debug('ViewLLMPage form is invalid', form.formState.errors, form.formState.isValid)
  }

  return <Card className='w-full'>
    <header className='compact level'>
      <h1 className='text-2xl font-bold'>
        Codex Login Token
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
          placeholder='OpenAI Primary'
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
          placeholder='gpt-4o-mini'
          isInvalid={Boolean(form.formState.errors.preferredModel)}
          errorMessage={form.formState.errors.preferredModel?.message}
          selectedKey={form.watch('preferredModel') || ''}
          onSelectionChange={(value) => {
            form.setValue('preferredModel', value as string, { shouldDirty: true, shouldValidate: true })
          }}
          >{ SUPPORTED_MODELS_BY_LLM.OPENAI_LOGIN_TOKEN.map((model) => (
            <AutocompleteItem key={model}>{
              model
            }</AutocompleteItem>
          ))
        }</Autocomplete>
      </div>
      <div className='compact'>
        <div className='compact'>
          <label>API Key</label>
          <Monaco
            height='200px'
            fileLanguage='json'
            minimapOverride={false}
            value={form.watch('apiKey') || ''}
            onChange={(value) => {
              form.setValue('apiKey', value, { shouldDirty: true, shouldValidate: true })
            }}
            fontSize={12}
          />
        </div>
        { tokenErrorMessage
          ? <Alert
            color='danger'
            className='compact text-sm'
          >{ tokenErrorMessage }</Alert>
          : <></>
        }
        <div className='compact level-left gap-1'>
          <Information
            title='Getting the correct scopes'
            content={() => <div className='text-sm'>
              <div className='compact'>
                <p className='block mb-2'>Follow these instructions:</p>
                <ul className='list-disc list-inside mb-2'>
                  <li>Download the @openai/codex CLI</li>
                  <li>Run it with the command `codex`</li>
                  <li>Authenticate with OpenAI</li>
                  <li>Copy the contents of ~/.codex/auth.json</li>
                  <li>Paste that into this field</li>
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
        onSave={onSaveAndCloseIfCreate}
        isDirty={form.formState.isDirty}
        isLoading={form.formState.isSubmitting}
        isDisabled={!form.formState.isValid}
      />
    </div>
  </Card>
}

function useJsonTokenValidityChecker(
  token: string,
  otherError: string,
  isTokenRequired: boolean,
): string | null {
  return useMemo(() => {
    if (!isTokenRequired) {
      return ''
    }

    if (!token) {
      return 'Token is required'
    }

    if (otherError) {
      return otherError
    }

    const asJson = safeParseJson<CodexAuthJson>(token)

    if (!asJson) {
      return 'Token is not a valid JSON string'
    }

    if (!asJson?.tokens?.access_token) {
      return 'Token JSON must contain an tokens.access_token field'
    }

    return null
  }, [ token, otherError, isTokenRequired ])
}
