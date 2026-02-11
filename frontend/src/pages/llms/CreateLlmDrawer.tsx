// Copyright © 2026 Jalapeno Labs

import type { Selection } from '@react-types/shared'
import type { LlmRecord } from '@common/types'

// Core
import { useEffect, useState } from 'react'

// Lib
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

// User interface
import {
  Button,
  Card,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Form,
  Input,
  Select,
  SelectItem,
} from '@heroui/react'
import { Monaco } from '@frontend/common/Monaco'

// Misc
import { SUPPORTED_MODELS_BY_LLM } from '@common/constants'
import {
  llmUpdateSchema,
  openAiApiKeyLlmCreateSchema,
  openAiLoginTokenLlmCreateSchema,
} from '@common/schema'
import {
  createOpenAiApiKeyLlm,
  createOpenAiLoginTokenLlm,
  updateLlm,
} from '@frontend/lib/routes/llmRoutes'

const llmTypeOptions = [
  'OPENAI_API_KEY',
  'OPENAI_LOGIN_TOKEN',
] as const

const llmTypeSchema = z.enum(llmTypeOptions)

type LlmType = z.infer<typeof llmTypeSchema>
type DrawerMode = 'create' | 'edit'
type LlmUpdatePayload = z.infer<typeof llmUpdateSchema>

const llmTypeLabels: Record<LlmType, string> = {
  OPENAI_API_KEY: 'OpenAI with API key',
  OPENAI_LOGIN_TOKEN: 'OpenAI with Codex auth',
}

const openAiModelSchema = z.enum(SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY)
const tokenLimitSchema = z.number().int().nonnegative().optional()

const openAiApiKeyEditSchema = z.object({
  name: z.string().trim().min(1),
  preferredModel: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).optional(),
  tokenLimit: tokenLimitSchema,
  isDefault: z.boolean().optional().default(false),
}).strict()

const openAiLoginTokenEditSchema = z.object({
  name: z.string().trim().min(1),
  accessToken: z.string().trim().min(1).optional(),
  tokenLimit: tokenLimitSchema,
  isDefault: z.boolean().optional().default(false),
}).strict()

type OpenAiApiKeyFormValues = z.infer<typeof openAiApiKeyLlmCreateSchema>
type OpenAiLoginTokenFormValues = z.infer<typeof openAiLoginTokenLlmCreateSchema>
type OpenAiApiKeyEditFormValues = z.infer<typeof openAiApiKeyEditSchema>
type OpenAiLoginTokenEditFormValues = z.infer<typeof openAiLoginTokenEditSchema>

type Props = {
  isOpen: boolean
  isDisabled: boolean
  mode: DrawerMode
  llm?: LlmRecord | null
  onOpenChange: (isOpen: boolean) => void
}

function resolveSelection<OptionType extends string>(
  selection: Selection,
  schema: z.ZodEnum<[OptionType, ...OptionType[]]>,
  context: string,
): OptionType | null {
  if (selection === 'all') {
    console.debug('CreateLlmDrawer received an unexpected selection', {
      context,
      selection,
    })
    return null
  }

  const selectedKey = Array.from(selection)[0]
  if (!selectedKey || typeof selectedKey !== 'string') {
    console.debug('CreateLlmDrawer failed to resolve a selection', {
      context,
      selection,
    })
    return null
  }

  const parsedSelection = schema.safeParse(selectedKey)
  if (!parsedSelection.success) {
    console.debug('CreateLlmDrawer received an unknown selection value', {
      context,
      selection,
    })
    return null
  }

  return parsedSelection.data
}

function getDefaultModel(models: readonly string[], context: string) {
  const defaultModel = models[0]
  if (!defaultModel) {
    console.debug('CreateLlmDrawer missing supported models', {
      context,
    })
    return ''
  }

  return defaultModel
}

function getTokenLimitInputValue(value?: number) {
  if (value === undefined || value === null) {
    return ''
  }

  return value.toString()
}

function normalizeCodexAuthJson(rawValue: string, context: string): {
  isValid: boolean
  normalizedValue: string | null
} {
  const trimmedValue = rawValue.trim()

  if (!trimmedValue) {
    console.debug('CreateLlmDrawer received empty codex auth json', { context })
    return {
      isValid: false,
      normalizedValue: null,
    }
  }

  try {
    const parsedValue: unknown = JSON.parse(trimmedValue)
    const normalizedValue: string = JSON.stringify(parsedValue)

    return {
      isValid: true,
      normalizedValue,
    }
  }
  catch (error) {
    console.debug('CreateLlmDrawer failed to parse codex auth json', {
      context,
      error,
    })

    return {
      isValid: false,
      normalizedValue: null,
    }
  }
}

function createTokenLimitChangeHandler(
  onChange: (value: number | undefined) => void,
  context: string,
) {
  return function handleTokenLimitChange(value: string) {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      onChange(undefined)
      return
    }

    const parsedValue = Number(trimmedValue)
    if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue) || parsedValue < 0) {
      console.debug('CreateLlmDrawer token limit is invalid', {
        context,
        value,
      })
      return
    }

    onChange(parsedValue)
  }
}

function getOpenAiApiKeyDefaults(): OpenAiApiKeyFormValues {
  return {
    name: '',
    preferredModel: getDefaultModel(SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY, 'openai-api-key'),
    apiKey: '',
    tokenLimit: undefined,
    isDefault: false,
  }
}

function getOpenAiLoginTokenDefaults(): OpenAiLoginTokenFormValues {
  return {
    name: '',
    accessToken: '',
    tokenLimit: undefined,
    isDefault: false,
  }
}

function getOpenAiApiKeyEditDefaults(llm: LlmRecord): OpenAiApiKeyEditFormValues {
  return {
    name: llm.name || '',
    preferredModel: llm.preferredModel || getDefaultModel(SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY, 'openai-edit'),
    apiKey: undefined,
    tokenLimit: llm.tokenLimit ?? undefined,
    isDefault: llm.isDefault,
  }
}

function getOpenAiLoginTokenEditDefaults(llm: LlmRecord): OpenAiLoginTokenEditFormValues {
  return {
    name: llm.name || '',
    accessToken: undefined,
    tokenLimit: llm.tokenLimit ?? undefined,
    isDefault: llm.isDefault,
  }
}

function buildApiKeyUpdatePayload(values: OpenAiApiKeyEditFormValues): LlmUpdatePayload {
  const payload: LlmUpdatePayload = {
    name: values.name,
    preferredModel: values.preferredModel,
    isDefault: values.isDefault,
  }

  if (values.tokenLimit !== undefined) {
    payload.tokenLimit = values.tokenLimit
  }

  const trimmedApiKey = values.apiKey?.trim()
  if (trimmedApiKey) {
    payload.apiKey = trimmedApiKey
  }

  return payload
}

function buildLoginTokenUpdatePayload(values: OpenAiLoginTokenEditFormValues): LlmUpdatePayload {
  const payload: LlmUpdatePayload = {
    name: values.name,
    isDefault: values.isDefault,
  }

  if (values.tokenLimit !== undefined) {
    payload.tokenLimit = values.tokenLimit
  }

  const trimmedAccessToken = values.accessToken?.trim()
  if (trimmedAccessToken) {
    const normalizedCodexAuth = normalizeCodexAuthJson(trimmedAccessToken, 'login-token-update')
    if (!normalizedCodexAuth.isValid || !normalizedCodexAuth.normalizedValue) {
      console.debug('CreateLlmDrawer skipped accessToken update because JSON is invalid')
    }
    else {
      payload.accessToken = normalizedCodexAuth.normalizedValue
    }
  }

  return payload
}

export function CreateLlmDrawer(props: Props) {
  const [ llmType, setLlmType ] = useState<LlmType>('OPENAI_API_KEY')
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)

  const openAiApiKeyForm = useForm<OpenAiApiKeyFormValues>({
    resolver: zodResolver(openAiApiKeyLlmCreateSchema),
    defaultValues: getOpenAiApiKeyDefaults(),
  })

  const openAiLoginTokenForm = useForm<OpenAiLoginTokenFormValues>({
    resolver: zodResolver(openAiLoginTokenLlmCreateSchema),
    defaultValues: getOpenAiLoginTokenDefaults(),
  })

  const openAiApiKeyEditForm = useForm<OpenAiApiKeyEditFormValues>({
    resolver: zodResolver(openAiApiKeyEditSchema),
    defaultValues: {
      name: '',
      preferredModel: getDefaultModel(
        SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY,
        'openai-api-key-edit-defaults',
      ),
      apiKey: undefined,
      tokenLimit: undefined,
      isDefault: false,
    },
  })

  const openAiLoginTokenEditForm = useForm<OpenAiLoginTokenEditFormValues>({
    resolver: zodResolver(openAiLoginTokenEditSchema),
    defaultValues: {
      name: '',
      accessToken: undefined,
      tokenLimit: undefined,
      isDefault: false,
    },
  })

  const isEditMode = props.mode === 'edit'
  const activeOpenAiApiKeyForm = isEditMode ? openAiApiKeyEditForm : openAiApiKeyForm
  const activeOpenAiLoginTokenForm = isEditMode ? openAiLoginTokenEditForm : openAiLoginTokenForm

  const llmTypeKeys = [ llmType ]
  const openAiModelValue = activeOpenAiApiKeyForm.watch('preferredModel')
  const openAiModelKeys = openAiModelValue ? [ openAiModelValue ] : []

  useEffect(function resetDrawerState() {
    if (props.isOpen) {
      return
    }

    setLlmType('OPENAI_API_KEY')
    setStatusMessage(null)
    openAiApiKeyForm.reset(getOpenAiApiKeyDefaults())
    openAiLoginTokenForm.reset(getOpenAiLoginTokenDefaults())
    openAiApiKeyEditForm.reset({
      name: '',
      preferredModel: getDefaultModel(SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY, 'openai-api-key-edit-defaults'),
      apiKey: undefined,
      tokenLimit: undefined,
      isDefault: false,
    })
    openAiLoginTokenEditForm.reset({
      name: '',
      accessToken: undefined,
      tokenLimit: undefined,
      isDefault: false,
    })
  }, [ props.isOpen, openAiApiKeyForm, openAiLoginTokenForm, openAiApiKeyEditForm, openAiLoginTokenEditForm ])

  useEffect(function syncEditDefaults() {
    if (!props.isOpen || props.mode !== 'edit') {
      return
    }

    if (!props.llm) {
      console.debug('CreateLlmDrawer edit requested without a llm')
      setStatusMessage('Select an LLM to edit.')
      return
    }

    setStatusMessage(null)
    setLlmType(props.llm.type)

    if (props.llm.type === 'OPENAI_API_KEY') {
      openAiApiKeyEditForm.reset(getOpenAiApiKeyEditDefaults(props.llm))
      return
    }

    openAiLoginTokenEditForm.reset(getOpenAiLoginTokenEditDefaults(props.llm))
  }, [ props.llm, props.isOpen, props.mode, openAiApiKeyEditForm, openAiLoginTokenEditForm ])

  function handleLlmTypeSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(selection, llmTypeSchema, 'llm-type')
    if (!resolvedSelection) {
      return
    }

    setStatusMessage(null)
    setLlmType(resolvedSelection)
  }

  function handleOpenAiModelSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(selection, openAiModelSchema, 'openai-preferred-model')
    if (!resolvedSelection) {
      return
    }

    setStatusMessage(null)
    activeOpenAiApiKeyForm.setValue('preferredModel', resolvedSelection, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const onSubmitOpenAiApiKey = openAiApiKeyForm.handleSubmit(async function onSubmit(values) {
    setStatusMessage(null)

    try {
      await createOpenAiApiKeyLlm(values)
      props.onOpenChange(false)
      openAiApiKeyForm.reset(getOpenAiApiKeyDefaults())
    }
    catch (error) {
      console.debug('CreateLlmDrawer failed to create OpenAI API key llm', { error })
      setStatusMessage('Unable to create the OpenAI LLM right now.')
    }
  })

  const onSubmitOpenAiLoginToken = openAiLoginTokenForm.handleSubmit(async function onSubmit(values) {
    setStatusMessage(null)

    const normalizedCodexAuth = normalizeCodexAuthJson(values.accessToken, 'create-login-token')
    if (!normalizedCodexAuth.isValid || !normalizedCodexAuth.normalizedValue) {
      setStatusMessage('Codex auth.json must be valid JSON before saving.')
      return
    }

    try {
      await createOpenAiLoginTokenLlm({
        ...values,
        accessToken: normalizedCodexAuth.normalizedValue,
      })
      props.onOpenChange(false)
      openAiLoginTokenForm.reset(getOpenAiLoginTokenDefaults())
    }
    catch (error) {
      console.debug('CreateLlmDrawer failed to create OpenAI login token llm', { error })
      setStatusMessage('Unable to create the OpenAI login LLM right now.')
    }
  })

  const onSubmitOpenAiApiKeyEdit = openAiApiKeyEditForm.handleSubmit(async function onSubmit(values) {
    setStatusMessage(null)

    if (!props.llm) {
      console.debug('CreateLlmDrawer edit submit missing llm')
      setStatusMessage('Select an LLM to edit.')
      return
    }

    try {
      await updateLlm(props.llm.id, buildApiKeyUpdatePayload(values))
      props.onOpenChange(false)
    }
    catch (error) {
      console.debug('CreateLlmDrawer failed to edit OpenAI llm', {
        error,
        llmId: props.llm.id,
      })
      setStatusMessage('Unable to update the OpenAI LLM right now.')
    }
  })

  const onSubmitOpenAiLoginTokenEdit = openAiLoginTokenEditForm.handleSubmit(async function onSubmit(values) {
    setStatusMessage(null)

    if (!props.llm) {
      console.debug('CreateLlmDrawer edit submit missing llm')
      setStatusMessage('Select an LLM to edit.')
      return
    }

    const hasAccessTokenUpdate = Boolean(values.accessToken?.trim())
    if (hasAccessTokenUpdate) {
      const normalizedCodexAuth = normalizeCodexAuthJson(values.accessToken || '', 'edit-login-token')
      if (!normalizedCodexAuth.isValid) {
        setStatusMessage('Codex auth.json must be valid JSON before saving.')
        return
      }
    }

    try {
      await updateLlm(props.llm.id, buildLoginTokenUpdatePayload(values))
      props.onOpenChange(false)
    }
    catch (error) {
      console.debug('CreateLlmDrawer failed to edit login llm', {
        error,
        llmId: props.llm.id,
      })
      setStatusMessage('Unable to update the OpenAI login LLM right now.')
    }
  })

  function getActiveFormState() {
    if (llmType === 'OPENAI_API_KEY') {
      return activeOpenAiApiKeyForm.formState
    }

    return activeOpenAiLoginTokenForm.formState
  }

  function getActiveSubmitHandler() {
    if (llmType === 'OPENAI_API_KEY') {
      if (isEditMode) {
        return onSubmitOpenAiApiKeyEdit
      }
      return onSubmitOpenAiApiKey
    }

    if (isEditMode) {
      return onSubmitOpenAiLoginTokenEdit
    }
    return onSubmitOpenAiLoginToken
  }

  function renderOpenAiApiKeyFields(isFormDisabled: boolean) {
    const apiKeyLabel = isEditMode ? 'API key (optional)' : 'API key'

    return <Card className='relaxed w-full'>
      <div className='relaxed w-full'>
        <Controller
          control={activeOpenAiApiKeyForm.control}
          name='name'
          render={({ field }) => (
            <Input
              autoFocus
              label='Name'
              placeholder='My OpenAI key'
              className='compact w-full'
              isRequired
              isInvalid={Boolean(activeOpenAiApiKeyForm.formState.errors.name)}
              errorMessage={activeOpenAiApiKeyForm.formState.errors.name?.message}
              isDisabled={isFormDisabled}
              value={field.value}
              name={field.name}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Select
          label='Preferred model'
          className='compact w-full'
          selectedKeys={openAiModelKeys}
          onSelectionChange={handleOpenAiModelSelection}
          isInvalid={Boolean(activeOpenAiApiKeyForm.formState.errors.preferredModel)}
          errorMessage={activeOpenAiApiKeyForm.formState.errors.preferredModel?.message}
          isDisabled={isFormDisabled}
        >{
          SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY.map((model) => (
            <SelectItem key={model}>{
              model
            }</SelectItem>
          ))
        }</Select>
        <Controller
          control={activeOpenAiApiKeyForm.control}
          name='apiKey'
          render={({ field }) => (
            <Input
              label={apiKeyLabel}
              placeholder='sk-live-...'
              className='compact w-full'
              type='password'
              isRequired={!isEditMode}
              isInvalid={Boolean(activeOpenAiApiKeyForm.formState.errors.apiKey)}
              errorMessage={activeOpenAiApiKeyForm.formState.errors.apiKey?.message}
              isDisabled={isFormDisabled}
              value={field.value || ''}
              name={field.name}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={activeOpenAiApiKeyForm.control}
          name='tokenLimit'
          render={({ field }) => (
            <Input
              label='Token limit (optional)'
              placeholder='500000'
              className='compact w-full'
              type='number'
              min='0'
              isInvalid={Boolean(activeOpenAiApiKeyForm.formState.errors.tokenLimit)}
              errorMessage={activeOpenAiApiKeyForm.formState.errors.tokenLimit?.message}
              isDisabled={isFormDisabled}
              value={getTokenLimitInputValue(field.value)}
              name={field.name}
              onValueChange={createTokenLimitChangeHandler(field.onChange, 'openai-token-limit')}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={activeOpenAiApiKeyForm.control}
          name='isDefault'
          render={({ field }) => (
            <Checkbox
              isSelected={Boolean(field.value)}
              isDisabled={isFormDisabled}
              onValueChange={field.onChange}
            >{
              'Set as default LLM'
            }</Checkbox>
          )}
        />
      </div>
    </Card>
  }

  function renderOpenAiLoginTokenFields(isFormDisabled: boolean) {
    const codexAuthLabel = isEditMode
      ? 'Codex auth.json (optional when editing)'
      : 'Codex auth.json'

    return <Card className='relaxed w-full'>
      <div className='relaxed w-full'>
        <Controller
          control={activeOpenAiLoginTokenForm.control}
          name='name'
          render={({ field }) => (
            <Input
              autoFocus
              label='Name'
              placeholder='OpenAI Codex auth'
              className='compact w-full'
              isRequired
              isInvalid={Boolean(activeOpenAiLoginTokenForm.formState.errors.name)}
              errorMessage={activeOpenAiLoginTokenForm.formState.errors.name?.message}
              isDisabled={isFormDisabled}
              value={field.value}
              name={field.name}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className='compact'>
          <div className='compact text-sm'>
            <strong>{codexAuthLabel}</strong>
          </div>
          <p className='compact text-sm opacity-80'>
            Paste the full contents of your ~/.codex/auth.json file to enable Codex authentication.
          </p>
          <Controller
            control={activeOpenAiLoginTokenForm.control}
            name='accessToken'
            render={({ field }) => (
              <Monaco
                height='220px'
                fileLanguage='json'
                value={field.value || ''}
                onChange={(value) => field.onChange(value || '')}
                minimapOverride={false}
                readOnly={isFormDisabled}
              />
            )}
          />
          <p className='text-sm opacity-80'>
            This value is stored as your LLM accessToken in stringified form.
          </p>
          <p className='text-sm text-danger'>
            {activeOpenAiLoginTokenForm.formState.errors.accessToken?.message}
          </p>
        </div>
        <Controller
          control={activeOpenAiLoginTokenForm.control}
          name='tokenLimit'
          render={({ field }) => (
            <Input
              label='Token limit (optional)'
              placeholder='500000'
              className='compact w-full'
              type='number'
              min='0'
              isInvalid={Boolean(activeOpenAiLoginTokenForm.formState.errors.tokenLimit)}
              errorMessage={activeOpenAiLoginTokenForm.formState.errors.tokenLimit?.message}
              isDisabled={isFormDisabled}
              value={getTokenLimitInputValue(field.value)}
              name={field.name}
              onValueChange={createTokenLimitChangeHandler(field.onChange, 'openai-login-token-limit')}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={activeOpenAiLoginTokenForm.control}
          name='isDefault'
          render={({ field }) => (
            <Checkbox
              isSelected={Boolean(field.value)}
              isDisabled={isFormDisabled}
              onValueChange={field.onChange}
            >{
              'Set as default LLM'
            }</Checkbox>
          )}
        />
      </div>
    </Card>
  }

  function renderActiveFields(isFormDisabled: boolean) {
    if (llmType === 'OPENAI_API_KEY') {
      return renderOpenAiApiKeyFields(isFormDisabled)
    }

    return renderOpenAiLoginTokenFields(isFormDisabled)
  }

  let statusBanner = null
  if (statusMessage) {
    statusBanner = <Card className='p-4'>
      <p className='opacity-80'>{
        statusMessage
      }</p>
    </Card>
  }

  const activeFormState = getActiveFormState()
  const isFormDisabled = props.isDisabled || activeFormState.isSubmitting
  const onSubmit = getActiveSubmitHandler()
  const drawerTitle = isEditMode ? 'Edit LLM' : 'Create LLM'
  const drawerCta = isEditMode ? 'Save changes' : 'Create LLM'
  const isTypeSelectionDisabled = props.isDisabled || isEditMode

  return <Drawer
    placement='right'
    isOpen={props.isOpen}
    onOpenChange={props.onOpenChange}
  >
    <DrawerContent>
      <Form onSubmit={onSubmit} className='relaxed w-full'>
        <DrawerHeader>
          <div className='relaxed w-full'>
            <div className='text-2xl'>
              <strong>{drawerTitle}</strong>
            </div>
            <p className='opacity-80'>
              Add a new LLM and choose the default model.
            </p>
          </div>
        </DrawerHeader>
        <DrawerBody className='w-full'>
          <div className='relaxed w-full'>
            <Select
              label='LLM type'
              selectedKeys={llmTypeKeys}
              onSelectionChange={handleLlmTypeSelection}
              className='compact w-full'
              isDisabled={isTypeSelectionDisabled}
            >{
              llmTypeOptions.map((option) => (
                <SelectItem key={option}>{
                  llmTypeLabels[option]
                }</SelectItem>
              ))
            }</Select>
            { statusBanner }
            { renderActiveFields(isFormDisabled) }
          </div>
        </DrawerBody>
        <DrawerFooter className='w-full'>
          <div className='relaxed w-full'>
            <Button
              color='primary'
              type='submit'
              className='w-full compact'
              isLoading={activeFormState.isSubmitting}
              isDisabled={isFormDisabled}
            >
              <span>{drawerCta}</span>
            </Button>
            <Button
              variant='light'
              type='button'
              className='w-full compact'
              onPress={() => props.onOpenChange(false)}
            >
              <span>Cancel</span>
            </Button>
          </div>
        </DrawerFooter>
      </Form>
    </DrawerContent>
  </Drawer>
}
