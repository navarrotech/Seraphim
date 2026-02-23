// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'

// Core
import { useState, useEffect, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// UI
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react'
import { Monaco } from '@frontend/elements/Monaco'

// Utility
import { convertEnvironmentToDotEnv, convertDotEnvToEnvironment } from '@common/envKit'

type Props = {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onOpenChange: (isOpen: boolean) => void
  environment: Environment[]
  onChange: (environment: Environment[]) => void
}

export function BulkEditModal(props: Props) {
  const [ value, setValue ] = useState<string>('')

  useEffect(() => {
    if (!props.isOpen) {
      return
    }

    const asDotEnv = convertEnvironmentToDotEnv(props.environment)
    setValue(asDotEnv)
  }, [ props.isOpen, props.environment ])

  const onSave = useCallback(() => {
    const asEnvironment = convertDotEnvToEnvironment(value)
    props.onChange?.(asEnvironment)
    props.onClose()
  }, [ value, props ])

  useHotkey([ 'Control', 'Enter' ], onSave)
  useHotkey([ 'Control', 'S' ], onSave)
  useHotkey([ 'Escape' ], props.onClose)

  return <Modal
    size='3xl'
    isOpen={props.isOpen}
    onOpenChange={props.onOpenChange}
  >
    <ModalContent>
      {(onClose) => (
        <>
          <ModalHeader className='flex flex-col gap-1'>
            <span>Bulk Edit Environment Variables</span>
          </ModalHeader>
          <ModalBody>
            <Monaco
              value={value}
              onChange={setValue}
              height='500px'
              fileLanguage='ini'
              minimapOverride={false}
            />
          </ModalBody>
          <ModalFooter>
            <Button onPress={onClose}>
              <span>Cancel</span>
            </Button>
            <Button color='primary' onPress={onSave}>
              <span>Save</span>
            </Button>
          </ModalFooter>
        </>
      )}
    </ModalContent>
  </Modal>
}
