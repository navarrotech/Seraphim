// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'
import type { ButtonProps } from '@heroui/react'
import type { Promisable } from 'type-fest'

// Core
import { createContext, useState, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@heroui/react'

// This provides a "confirm" modal that is used instead of the native confirm()
// It's meant to look a LOT more polished and consistent with the rest of the UI

export type ConfirmOptions = {
  title: string | ReactNode
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  confirmColor?: ButtonProps['color']
  cancelColor?: ButtonProps['color']
  onConfirm: () => Promisable<any>
  onCancel?: () => Promisable<any>
}

// Create with a placeholder that’ll error if you forgot the provider
export const ConfirmContext = createContext<(options: ConfirmOptions) => void>(() => {
  throw new Error('ConfirmProvider is missing from the tree')
})

type Props = {
  children: ReactNode
}

export function ConfirmGate(props: Props) {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()
  const [ options, setOptions ] = useState<ConfirmOptions | null>(null)
  const [ isIntermittent, setIntermittent ] = useState<boolean>(false)

  const openConfirm = useCallback((opts: ConfirmOptions) => {
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
      await options?.onConfirm?.()
    }
    finally {
      handleClose()
      setIntermittent(false)
    }
  }, [ isOpen, options, handleClose ])

  const handleCancel = useCallback(async () => {
    if (!isOpen || !options) {
      return
    }

    handleClose()
    await options?.onCancel?.()
  }, [ isOpen, options, handleClose ])

  useHotkey([ 'Enter' ], handleConfirm, {
    preventDefault: isOpen,
    enabled: isOpen,
  })
  useHotkey([ 'Escape' ], handleCancel, {
    preventDefault: isOpen,
    enabled: isOpen,
  })

  return <ConfirmContext.Provider value={openConfirm}>
    { props.children }
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop='blur'>
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
        }</ModalBody>
        <ModalFooter>
          <Button
            color={options?.cancelColor ?? 'secondary'}
            isDisabled={isIntermittent}
            onPress={handleCancel}
          >{
              options?.cancelText ?? 'Cancel'
            }</Button>
          <Button
            color={options?.confirmColor ??'primary'}
            isLoading={isIntermittent}
            onPress={handleConfirm}
          >{
              options?.confirmText ?? 'Confirm'
            }</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </ConfirmContext.Provider>
}
