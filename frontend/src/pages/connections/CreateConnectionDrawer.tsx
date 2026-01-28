// Copyright © 2026 Jalapeno Labs

import type { Selection } from '@react-types/shared'
import type { ConnectionRecord } from '@frontend/lib/types/connectionTypes'

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

// Misc
import { SUPPORTED_MODELS_BY_LLM } from '@common/constants'
import {
  connectionUpdateSchema,
  kimiApiKeyConnectionCreateSchema,
  openAiApiKeyConnectionCreateSchema,
  openAiLoginTokenConnectionCreateSchema,
} from '@common/schema'
import {
  createKimiApiKeyConnection,
  createOpenAiApiKeyConnection,
  createOpenAiLoginTokenConnection,
  updateConnection,
} from '@frontend/lib/routes/connectionRoutes'

const connectionTypeOptions = [
  'OPENAI_API_KEY',
  'KIMI_API_KEY',
  'OPENAI_LOGIN_TOKEN',
] as const

const connectionTypeSchema = z.enum(connectionTypeOptions)

type ConnectionType = z.infer<typeof connectionTypeSchema>

type DrawerMode = 'create' | 'edit'

type ConnectionUpdatePayload = z.infer<typeof connectionUpdateSchema>

const connectionTypeLabels: Record<ConnectionType, string> = {
  OPENAI_API_KEY: 'OpenAI (API key)',
  KIMI_API_KEY: 'Kimi K2 (API key)',
  OPENAI_LOGIN_TOKEN: 'OpenAI (Login token)',
}

const openAiModelSchema = z.enum(SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY)
const kimiModelSchema = z.enum(SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY)
const tokenLimitSchema = z.number().int().nonnegative().optional()

const openAiApiKeyEditSchema = z.object({
  name: z.string().trim().min(1),
  preferredModel: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).optional(),
  tokenLimit: tokenLimitSchema,
  isDefault: z.boolean().optional().default(false),
}).strict()

const kimiApiKeyEditSchema = z.object({
  name: z.string().trim().min(1),
  preferredModel: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).optional(),
  tokenLimit: tokenLimitSchema,
  isDefault: z.boolean().optional().default(false),
}).strict()

const openAiLoginTokenEditSchema = z.object({
  name: z.string().trim().min(1),
  tokenLimit: tokenLimitSchema,
  isDefault: z.boolean().optional().default(false),
}).strict()

type OpenAiApiKeyFormValues = z.infer<typeof openAiApiKeyConnectionCreateSchema>
type KimiApiKeyFormValues = z.infer<typeof kimiApiKeyConnectionCreateSchema>
type OpenAiLoginTokenFormValues = z.infer<
  typeof openAiLoginTokenConnectionCreateSchema
>

type OpenAiApiKeyEditFormValues = z.infer<typeof openAiApiKeyEditSchema>
type KimiApiKeyEditFormValues = z.infer<typeof kimiApiKeyEditSchema>
type OpenAiLoginTokenEditFormValues = z.infer<typeof openAiLoginTokenEditSchema>

type Props = {
  isOpen: boolean
  isDisabled: boolean
  mode: DrawerMode
  connection?: ConnectionRecord | null
  onOpenChange: (isOpen: boolean) => void
}

function resolveSelection<OptionType extends string>(
  selection: Selection,
  schema: z.ZodEnum<[OptionType, ...OptionType[]]>,
  context: string,
): OptionType | null {
  if (selection === 'all') {
    console.debug('CreateConnectionDrawer received an unexpected selection', {
      context,
      selection,
    })
    return null
  }

  const selectedKeys = Array.from(selection)
  const selectedKey = selectedKeys[0]

  if (!selectedKey) {
    console.debug('CreateConnectionDrawer failed to resolve a selection', {
      context,
      selection,
    })
    return null
  }

  if (typeof selectedKey !== 'string') {
    console.debug('CreateConnectionDrawer expected a string selection key', {
      context,
      selection,
    })
    return null
  }

  const parsedSelection = schema.safeParse(selectedKey)
  if (!parsedSelection.success) {
    console.debug('CreateConnectionDrawer received an unknown selection value', {
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
    console.debug('CreateConnectionDrawer missing supported models', {
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
    if (!Number.isFinite(parsedValue)) {
      console.debug('CreateConnectionDrawer token limit is not a number', {
        context,
        value,
      })
      return
    }

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      console.debug('CreateConnectionDrawer token limit must be a whole number', {
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
    preferredModel: getDefaultModel(
      SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY,
      'openai-api-key',
    ),
    apiKey: '',
    tokenLimit: undefined,
    isDefault: false,
  }
}

function getKimiApiKeyDefaults(): KimiApiKeyFormValues {
  return {
    name: '',
    preferredModel: getDefaultModel(
      SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY,
      'kimi-api-key',
    ),
    apiKey: '',
    tokenLimit: undefined,
    isDefault: false,
  }
}

function getOpenAiLoginTokenDefaults(): OpenAiLoginTokenFormValues {
  return {
    name: '',
    tokenLimit: undefined,
    isDefault: false,
  }
}

function getOpenAiApiKeyEditDefaults(
  connection: ConnectionRecord,
): OpenAiApiKeyEditFormValues {
  return {
    name: connection.name || '',
    preferredModel: connection.preferredModel || getDefaultModel(
      SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY,
      'openai-api-key-edit',
    ),
    apiKey: undefined,
    tokenLimit: connection.tokenLimit ?? undefined,
    isDefault: connection.isDefault,
  }
}

function getKimiApiKeyEditDefaults(
  connection: ConnectionRecord,
): KimiApiKeyEditFormValues {
  return {
    name: connection.name || '',
    preferredModel: connection.preferredModel || getDefaultModel(
      SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY,
      'kimi-api-key-edit',
    ),
    apiKey: undefined,
    tokenLimit: connection.tokenLimit ?? undefined,
    isDefault: connection.isDefault,
  }
}

function getOpenAiLoginTokenEditDefaults(
  connection: ConnectionRecord,
): OpenAiLoginTokenEditFormValues {
  return {
    name: connection.name || '',
    tokenLimit: connection.tokenLimit ?? undefined,
    isDefault: connection.isDefault,
  }
}

function buildApiKeyUpdatePayload(
  values: OpenAiApiKeyEditFormValues | KimiApiKeyEditFormValues,
  context: string,
): ConnectionUpdatePayload {
  const payload: ConnectionUpdatePayload = {
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
  else if (values.apiKey !== undefined) {
    console.debug('CreateConnectionDrawer received an empty apiKey', {
      context,
    })
  }

  return payload
}

function buildLoginTokenUpdatePayload(
  values: OpenAiLoginTokenEditFormValues,
): ConnectionUpdatePayload {
  const payload: ConnectionUpdatePayload = {
    name: values.name,
    isDefault: values.isDefault,
  }

  if (values.tokenLimit !== undefined) {
    payload.tokenLimit = values.tokenLimit
  }

  return payload
}

export function CreateConnectionDrawer(props: Props) {
  const [ connectionType, setConnectionType ] = useState<ConnectionType>(
    'OPENAI_API_KEY',
  )
  const [ statusMessage, setStatusMessage ] = useState<string | null>(null)

  const openAiApiKeyForm = useForm<OpenAiApiKeyFormValues>({
    resolver: zodResolver(openAiApiKeyConnectionCreateSchema),
    defaultValues: getOpenAiApiKeyDefaults(),
  })

  const kimiApiKeyForm = useForm<KimiApiKeyFormValues>({
    resolver: zodResolver(kimiApiKeyConnectionCreateSchema),
    defaultValues: getKimiApiKeyDefaults(),
  })

  const openAiLoginTokenForm = useForm<OpenAiLoginTokenFormValues>({
    resolver: zodResolver(openAiLoginTokenConnectionCreateSchema),
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

  const kimiApiKeyEditForm = useForm<KimiApiKeyEditFormValues>({
    resolver: zodResolver(kimiApiKeyEditSchema),
    defaultValues: {
      name: '',
      preferredModel: getDefaultModel(
        SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY,
        'kimi-api-key-edit-defaults',
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
      tokenLimit: undefined,
      isDefault: false,
    },
  })

  const isEditMode = props.mode === 'edit'
  const activeOpenAiApiKeyForm = isEditMode
    ? openAiApiKeyEditForm
    : openAiApiKeyForm
  const activeKimiApiKeyForm = isEditMode
    ? kimiApiKeyEditForm
    : kimiApiKeyForm
  const activeOpenAiLoginTokenForm = isEditMode
    ? openAiLoginTokenEditForm
    : openAiLoginTokenForm

  const connectionTypeKeys = connectionType
    ? [ connectionType ]
    : []

  const openAiModelValue = activeOpenAiApiKeyForm.watch('preferredModel')
  const openAiModelKeys = openAiModelValue
    ? [ openAiModelValue ]
    : []

  const kimiModelValue = activeKimiApiKeyForm.watch('preferredModel')
  const kimiModelKeys = kimiModelValue
    ? [ kimiModelValue ]
    : []

  useEffect(function resetDrawerState() {
    if (props.isOpen) {
      return
    }

    setConnectionType('OPENAI_API_KEY')
    setStatusMessage(null)
    openAiApiKeyForm.reset(getOpenAiApiKeyDefaults())
    kimiApiKeyForm.reset(getKimiApiKeyDefaults())
    openAiLoginTokenForm.reset(getOpenAiLoginTokenDefaults())
    openAiApiKeyEditForm.reset({
      name: '',
      preferredModel: getDefaultModel(
        SUPPORTED_MODELS_BY_LLM.OPENAI_API_KEY,
        'openai-api-key-edit-defaults',
      ),
      apiKey: undefined,
      tokenLimit: undefined,
      isDefault: false,
    })
    kimiApiKeyEditForm.reset({
      name: '',
      preferredModel: getDefaultModel(
        SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY,
        'kimi-api-key-edit-defaults',
      ),
      apiKey: undefined,
      tokenLimit: undefined,
      isDefault: false,
    })
    openAiLoginTokenEditForm.reset({
      name: '',
      tokenLimit: undefined,
      isDefault: false,
    })
  }, [
    props.isOpen,
    openAiApiKeyForm,
    kimiApiKeyForm,
    openAiLoginTokenForm,
    openAiApiKeyEditForm,
    kimiApiKeyEditForm,
    openAiLoginTokenEditForm,
  ])

  useEffect(function syncEditDefaults() {
    if (!props.isOpen || props.mode !== 'edit') {
      return
    }

    if (!props.connection) {
      console.debug('CreateConnectionDrawer edit requested without a connection')
      setStatusMessage('Select a connection to edit.')
      return
    }

    setStatusMessage(null)
    setConnectionType(props.connection.type)

    if (props.connection.type === 'OPENAI_API_KEY') {
      openAiApiKeyEditForm.reset(getOpenAiApiKeyEditDefaults(props.connection))
      return
    }

    if (props.connection.type === 'KIMI_API_KEY') {
      kimiApiKeyEditForm.reset(getKimiApiKeyEditDefaults(props.connection))
      return
    }

    openAiLoginTokenEditForm.reset(
      getOpenAiLoginTokenEditDefaults(props.connection),
    )
  }, [
    props.connection,
    props.isOpen,
    props.mode,
    openAiApiKeyEditForm,
    kimiApiKeyEditForm,
    openAiLoginTokenEditForm,
  ])

  function handleConnectionTypeSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(
      selection,
      connectionTypeSchema,
      'connection-type',
    )
    if (!resolvedSelection) {
      return
    }

    setStatusMessage(null)
    setConnectionType(resolvedSelection)
  }

  function handleOpenAiModelSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(
      selection,
      openAiModelSchema,
      'openai-preferred-model',
    )
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

  function handleKimiModelSelection(selection: Selection) {
    const resolvedSelection = resolveSelection(
      selection,
      kimiModelSchema,
      'kimi-preferred-model',
    )
    if (!resolvedSelection) {
      return
    }

    setStatusMessage(null)
    activeKimiApiKeyForm.setValue('preferredModel', resolvedSelection, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const onSubmitOpenAiApiKey = openAiApiKeyForm.handleSubmit(
    async function onSubmit(values) {
      setStatusMessage(null)

      try {
        await createOpenAiApiKeyConnection(values)
        props.onOpenChange(false)
        openAiApiKeyForm.reset(getOpenAiApiKeyDefaults())
      }
      catch (error) {
        console.debug(
          'CreateConnectionDrawer failed to create OpenAI API key connection',
          { error },
        )
        setStatusMessage('Unable to create the OpenAI connection right now.')
      }
    },
  )

  const onSubmitKimiApiKey = kimiApiKeyForm.handleSubmit(
    async function onSubmit(values) {
      setStatusMessage(null)

      try {
        await createKimiApiKeyConnection(values)
        props.onOpenChange(false)
        kimiApiKeyForm.reset(getKimiApiKeyDefaults())
      }
      catch (error) {
        console.debug(
          'CreateConnectionDrawer failed to create Kimi API key connection',
          { error },
        )
        setStatusMessage('Unable to create the Kimi connection right now.')
      }
    },
  )

  const onSubmitOpenAiLoginToken = openAiLoginTokenForm.handleSubmit(
    async function onSubmit(values) {
      setStatusMessage(null)

      try {
        await createOpenAiLoginTokenConnection(values)
        props.onOpenChange(false)
        openAiLoginTokenForm.reset(getOpenAiLoginTokenDefaults())
      }
      catch (error) {
        console.debug(
          'CreateConnectionDrawer failed to create OpenAI login token connection',
          { error },
        )
        setStatusMessage('Unable to create the OpenAI login connection right now.')
      }
    },
  )

  const onSubmitOpenAiApiKeyEdit = openAiApiKeyEditForm.handleSubmit(
    async function onSubmit(values) {
      setStatusMessage(null)

      if (!props.connection) {
        console.debug('CreateConnectionDrawer edit submit missing connection')
        setStatusMessage('Select a connection to edit.')
        return
      }

      try {
        const payload = buildApiKeyUpdatePayload(values, 'openai-api-key-edit')
        await updateConnection(props.connection.id, payload)
        props.onOpenChange(false)
      }
      catch (error) {
        console.debug('CreateConnectionDrawer failed to edit OpenAI connection', {
          error,
          connectionId: props.connection.id,
        })
        setStatusMessage('Unable to update the OpenAI connection right now.')
      }
    },
  )

  const onSubmitKimiApiKeyEdit = kimiApiKeyEditForm.handleSubmit(
    async function onSubmit(values) {
      setStatusMessage(null)

      if (!props.connection) {
        console.debug('CreateConnectionDrawer edit submit missing connection')
        setStatusMessage('Select a connection to edit.')
        return
      }

      try {
        const payload = buildApiKeyUpdatePayload(values, 'kimi-api-key-edit')
        await updateConnection(props.connection.id, payload)
        props.onOpenChange(false)
      }
      catch (error) {
        console.debug('CreateConnectionDrawer failed to edit Kimi connection', {
          error,
          connectionId: props.connection.id,
        })
        setStatusMessage('Unable to update the Kimi connection right now.')
      }
    },
  )

  const onSubmitOpenAiLoginTokenEdit = openAiLoginTokenEditForm.handleSubmit(
    async function onSubmit(values) {
      setStatusMessage(null)

      if (!props.connection) {
        console.debug('CreateConnectionDrawer edit submit missing connection')
        setStatusMessage('Select a connection to edit.')
        return
      }

      try {
        const payload = buildLoginTokenUpdatePayload(values)
        await updateConnection(props.connection.id, payload)
        props.onOpenChange(false)
      }
      catch (error) {
        console.debug('CreateConnectionDrawer failed to edit login connection', {
          error,
          connectionId: props.connection.id,
        })
        setStatusMessage('Unable to update the OpenAI login connection right now.')
      }
    },
  )

  function getActiveFormState() {
    if (connectionType === 'OPENAI_API_KEY') {
      return activeOpenAiApiKeyForm.formState
    }

    if (connectionType === 'KIMI_API_KEY') {
      return activeKimiApiKeyForm.formState
    }

    return activeOpenAiLoginTokenForm.formState
  }

  function getActiveSubmitHandler() {
    if (connectionType === 'OPENAI_API_KEY') {
      return isEditMode
        ? onSubmitOpenAiApiKeyEdit
        : onSubmitOpenAiApiKey
    }

    if (connectionType === 'KIMI_API_KEY') {
      return isEditMode
        ? onSubmitKimiApiKeyEdit
        : onSubmitKimiApiKey
    }

    return isEditMode
      ? onSubmitOpenAiLoginTokenEdit
      : onSubmitOpenAiLoginToken
  }

  function renderOpenAiApiKeyFields(isFormDisabled: boolean) {
    const apiKeyLabel = isEditMode
      ? 'API key (optional)'
      : 'API key'
    const apiKeyPlaceholder = isEditMode
      ? 'Enter a new API key'
      : 'sk-live-...'

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
          errorMessage={
            activeOpenAiApiKeyForm.formState.errors.preferredModel?.message
          }
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
              placeholder={apiKeyPlaceholder}
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
              onValueChange={createTokenLimitChangeHandler(
                field.onChange,
                'openai-token-limit',
              )}
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
              'Set as default connection'
            }</Checkbox>
          )}
        />
      </div>
    </Card>
  }

  function renderKimiApiKeyFields(isFormDisabled: boolean) {
    const apiKeyLabel = isEditMode
      ? 'API key (optional)'
      : 'API key'
    const apiKeyPlaceholder = isEditMode
      ? 'Enter a new API key'
      : 'kimi-...'

    return <Card className='relaxed w-full'>
      <div className='relaxed w-full'>
        <Controller
          control={activeKimiApiKeyForm.control}
          name='name'
          render={({ field }) => (
            <Input
              autoFocus
              label='Name'
              placeholder='Kimi K2 Main'
              className='compact w-full'
              isRequired
              isInvalid={Boolean(activeKimiApiKeyForm.formState.errors.name)}
              errorMessage={activeKimiApiKeyForm.formState.errors.name?.message}
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
          selectedKeys={kimiModelKeys}
          onSelectionChange={handleKimiModelSelection}
          isInvalid={Boolean(activeKimiApiKeyForm.formState.errors.preferredModel)}
          errorMessage={activeKimiApiKeyForm.formState.errors.preferredModel?.message}
          isDisabled={isFormDisabled}
        >{
          SUPPORTED_MODELS_BY_LLM.KIMI_API_KEY.map((model) => (
            <SelectItem key={model}>{
              model
            }</SelectItem>
          ))
        }</Select>
        <Controller
          control={activeKimiApiKeyForm.control}
          name='apiKey'
          render={({ field }) => (
            <Input
              label={apiKeyLabel}
              placeholder={apiKeyPlaceholder}
              className='compact w-full'
              type='password'
              isRequired={!isEditMode}
              isInvalid={Boolean(activeKimiApiKeyForm.formState.errors.apiKey)}
              errorMessage={activeKimiApiKeyForm.formState.errors.apiKey?.message}
              isDisabled={isFormDisabled}
              value={field.value || ''}
              name={field.name}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={activeKimiApiKeyForm.control}
          name='tokenLimit'
          render={({ field }) => (
            <Input
              label='Token limit (optional)'
              placeholder='500000'
              className='compact w-full'
              type='number'
              min='0'
              isInvalid={Boolean(activeKimiApiKeyForm.formState.errors.tokenLimit)}
              errorMessage={activeKimiApiKeyForm.formState.errors.tokenLimit?.message}
              isDisabled={isFormDisabled}
              value={getTokenLimitInputValue(field.value)}
              name={field.name}
              onValueChange={createTokenLimitChangeHandler(
                field.onChange,
                'kimi-token-limit',
              )}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={activeKimiApiKeyForm.control}
          name='isDefault'
          render={({ field }) => (
            <Checkbox
              isSelected={Boolean(field.value)}
              isDisabled={isFormDisabled}
              onValueChange={field.onChange}
            >{
              'Set as default connection'
            }</Checkbox>
          )}
        />
      </div>
    </Card>
  }

  function renderOpenAiLoginTokenFields(isFormDisabled: boolean) {
    return <Card className='relaxed w-full'>
      <div className='relaxed w-full'>
        <Controller
          control={activeOpenAiLoginTokenForm.control}
          name='name'
          render={({ field }) => (
            <Input
              autoFocus
              label='Name'
              placeholder='OpenAI Login'
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
              onValueChange={createTokenLimitChangeHandler(
                field.onChange,
                'openai-login-token-limit',
              )}
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
              'Set as default connection'
            }</Checkbox>
          )}
        />
      </div>
    </Card>
  }

  function renderActiveFields(isFormDisabled: boolean) {
    if (connectionType === 'OPENAI_API_KEY') {
      return renderOpenAiApiKeyFields(isFormDisabled)
    }

    if (connectionType === 'KIMI_API_KEY') {
      return renderKimiApiKeyFields(isFormDisabled)
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
  const drawerTitle = isEditMode
    ? 'Edit connection'
    : 'Create connection'
  const drawerCta = isEditMode
    ? 'Save changes'
    : 'Create connection'
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
              Add a new LLM connection and choose the default model.
            </p>
          </div>
        </DrawerHeader>
        <DrawerBody className='w-full'>
          <div className='relaxed w-full'>
            <Select
              label='Connection type'
              selectedKeys={connectionTypeKeys}
              onSelectionChange={handleConnectionTypeSelection}
              className='compact w-full'
              isDisabled={isTypeSelectionDisabled}
            >{
              connectionTypeOptions.map((option) => (
                <SelectItem key={option}>{
                  connectionTypeLabels[option]
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
