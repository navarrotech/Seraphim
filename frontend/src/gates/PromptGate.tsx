// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'
import type { ZodString } from 'zod'
import type { ButtonProps, InputProps } from '@heroui/react'
import type { Promisable } from 'type-fest'

// Core
import { createContext, useState, useCallback, useMemo, useEffect } from 'react'
import { useZod } from '@frontend/hooks/useZod'
import { useHotkey } from '@frontend/hooks/useHotkey'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Spinner,
  useDisclosure,
} from '@heroui/react'
import { isEmpty } from 'lodash-es'

// This provides a "prompt" modal that is used instead of the native prompt()
// It's meant to look a LOT more polished and consistent with the rest of the UI

export type PromptOptions = {
  title: string | ReactNode
  defaultValue?: string
  inputProps?: Partial<Omit<InputProps, 'id'>>
  validator?: ZodString
  message?: string | ReactNode
  confirmText?: string
  cancelText?: string
  promptColor?: ButtonProps['color']
  cancelColor?: ButtonProps['color']
  onConfirm: (value: string) => Promisable<any>
  onCancel?: () => Promisable<any>
}

// Create with a context that’ll error if you forgot the provider
export const PromptContext = createContext<(options: PromptOptions) => void>(() => {
  throw new Error('PromptProvider is missing from the tree')
})

type Props = {
  children: ReactNode
}

export function PromptGate(props: Props) {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  const [ options, setOptions ] = useState<PromptOptions | null>(null)
  const [ isIntermittent, setIntermittent ] = useState<boolean>(false)
  const [ value, setValue ] = useState<string>('')

  const validation = useZod(options?.validator, value)
  const isValid = useMemo(() => isEmpty(validation), [ validation ])

  const openPrompt = useCallback((opts: PromptOptions) => {
    if (typeof opts.inputProps?.placeholder === 'string') {
      opts.inputProps.placeholder = opts.inputProps.placeholder
    }
    if (typeof opts.inputProps?.description === 'string') {
      opts.inputProps.description = opts.inputProps.description
    }
    if (typeof opts.inputProps?.title === 'string') {
      opts.inputProps.title = opts.inputProps.title
    }
    if (typeof opts.inputProps?.label === 'string') {
      opts.inputProps.label = opts.inputProps.label
    }
    setOptions(opts)
    onOpen()
  }, [ onOpen ])

  const handleClose = useCallback(() => {
    onClose()
    setOptions(null)
  }, [ onClose ])

  const handleConfirm = useCallback(async () => {
    if (!isOpen || !options) {
      return
    }

    setIntermittent(true)
    try {
      await options?.onConfirm?.(value)
    }
    finally {
      handleClose()
      setIntermittent(false)
    }
  }, [ isOpen, options, handleClose, value ])

  const handleCancel = useCallback(async () => {
    if (!isOpen || !options) {
      return
    }

    handleClose()
    await options?.onCancel?.()
  }, [ isOpen, options, handleClose ])

  useEffect(() => {
    // Update the value state if the default changes while open
    if (options?.defaultValue && isOpen) {
      setValue(options.defaultValue)
    }
  }, [ options?.defaultValue ])

  useHotkey([ 'Enter' ], handleConfirm, { preventDefault: isOpen })
  useHotkey([ 'Escape' ], handleCancel, { preventDefault: isOpen })

  return <PromptContext.Provider value={openPrompt}>
    { props.children }
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>{
          options?.title
        }</ModalHeader>
        <ModalBody>{
          typeof options?.message === 'string'
            ? <p>{
              options?.message
            }</p>
            : options?.message
        }
        <Input
          id='the-prompt'
          autoFocus
          isRequired
          isDisabled={isIntermittent}
          endContent={isIntermittent
            ? <Spinner />
            : options?.inputProps?.endContent
          }
          {...options?.inputProps}
          type='text'
          value={value}
          onValueChange={setValue}
          errorMessage={!isValid && Object.values(validation).flat().join('\n')}
          isInvalid={!isValid}
          fullWidth
        />
        </ModalBody>
        <ModalFooter>
          <Button
            color={options?.cancelColor ?? 'default'}
            isDisabled={isIntermittent}
            onPress={handleCancel}
          >{
              options?.cancelText ?? 'Cancel'
            }</Button>
          <Button
            color={options?.promptColor ??'primary'}
            isLoading={isIntermittent}
            onPress={handleConfirm}
          >{
              options?.confirmText ?? 'Confirm'
            }</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </PromptContext.Provider>
}
