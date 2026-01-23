// Copyright © 2026 Jalapeno Labs

import type { Promisable } from 'type-fest'
import type { ButtonProps } from '@heroui/react'
import type { Blocker } from 'react-router'
import type { ReactNode } from 'react'

// Core
import { createContext, useState, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// UI
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Button,
  Tooltip,
} from '@heroui/react'
import { WarningIcon } from '@frontend/common/IconNexus'

export type UnsavedWorkOptions = {
  title?: string | ReactNode
  message?: string | ReactNode
  saveText?: string
  discardText?: string
  cancelText?: string
  saveColor?: ButtonProps['color']
  discardColor?: ButtonProps['color']
  cancelColor?: ButtonProps['color']
  onSave: () => Promisable<any>
  onDiscard?: () => Promisable<any>
  onCancel?: () => Promisable<any>
  blocker: Blocker
}

// Notes about blocker:
// blocker.reset() => "Stay here / Cancel navigation"
// blocker.proceed() => "Leave page / Continue navigation"

// Create with a placeholder that’ll error if you forgot the provider
export const UnsavedWorkContext = createContext<(options: UnsavedWorkOptions) => void>(() => {
  throw new Error('UnsavedWorkProvider is missing from the tree')
})

type Props = {
  children: ReactNode
}

export function UnsavedWorkGate(props: Props) {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()
  const [ options, setOptions ] = useState<UnsavedWorkOptions | null>(null)
  const [ isIntermittent, setIntermittent ] = useState<boolean>(false)

  const openPrompt = useCallback((options: UnsavedWorkOptions) => {
    setOptions({
      title: 'files.unsaved-work.title',
      message: 'files.unsaved-work.description',
      ...options,
    })
    onOpen()
  }, [ onOpen ])

  const handleClose = useCallback(() => {
    onClose()
    setOptions(null)
  }, [ onClose ])

  const handleSave = useCallback(async () => {
    if (!isOpen || !options) {
      return
    }

    setIntermittent(true)
    console.debug('User saved their work and is leaving the page.')
    try {
      await options?.onSave?.()
    }
    finally {
      options?.blocker.proceed()
      handleClose()
      setIntermittent(false)
    }
  }, [ isOpen, options, handleClose ])

  const handleDiscard = useCallback(async () => {
    if (!isOpen || !options) {
      return
    }

    setIntermittent(true)
    console.debug('User discarded their work and is leaving the page.')
    try {
      await options?.onDiscard?.()
    }
    finally {
      options?.blocker.proceed()
      handleClose()
      setIntermittent(false)
    }
  }, [ isOpen, options, handleClose ])

  const handleCancel = useCallback(async () => {
    if (!isOpen || !options) {
      return
    }

    console.debug('User cancelled navigation to stay on the page with unsaved work.')
    options?.blocker.reset()
    handleClose()
    await options?.onCancel?.()
  }, [ isOpen, options, handleClose ])

  useHotkey([ 'Enter' ], handleSave, { preventDefault: isOpen })
  useHotkey([ 'Escape' ], handleCancel, { preventDefault: isOpen })

  return <UnsavedWorkContext.Provider value={openPrompt}>
    { props.children }
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} onClose={handleCancel} backdrop='blur' size='xl'>
      <ModalContent>
        <ModalHeader>{
          typeof options?.title === 'string'
            ? <div className='level-left gap-1'>
              <WarningIcon size={28} />
              <h2 className='text-2xl font-semibold'>{
                options?.title
              }</h2>
            </div>
            : options?.title
        }</ModalHeader>
        <ModalBody>{
          typeof options?.message === 'string'
            ? <p>{
              options?.message
            }</p>
            : options?.message
        }</ModalBody>
        <ModalFooter>
          {/* Cancel, stay on the page */}
          <Tooltip content='Cancel and stay on the page'>
            <Button
              color={options?.cancelColor ?? 'default'}
              isDisabled={isIntermittent}
              onPress={handleCancel}
            >{
                options?.cancelText ?? 'Cancel'
              }</Button>
          </Tooltip>
          {/* Discard changes, leave the page */}
          <Tooltip content='Leave without saving'>
            <Button
              color={options?.discardColor ?? 'danger'}
              isLoading={isIntermittent}
              onPress={handleDiscard}
            >{
                options?.discardText ?? 'Leave'
              }</Button>
          </Tooltip>
          {/* Save changes, leave the page */}
          <Tooltip content='Save changes and leave'>
            <Button
              color={options?.saveColor ??'primary'}
              isLoading={isIntermittent}
              onPress={handleSave}
            >{
                options?.saveText ?? 'Save'
              }</Button>
          </Tooltip>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </UnsavedWorkContext.Provider>
}
