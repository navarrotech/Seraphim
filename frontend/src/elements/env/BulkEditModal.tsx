// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema/common'
import type { Marker } from '@frontend/framework/monaco'

// Core
import { useState, useEffect, useCallback } from 'react'
import { useMonacoMarkers } from '@frontend/hooks/useMarkers'
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
import { SaveButton } from '../SaveButton'

// Utility
import { convertEnvironmentToDotEnv, convertDotEnvToEnvironment } from '@common/envKit'
import { dotEnvEntryRegex } from '@common/regex'

type Props = {
  isOpen: boolean
  isReadOnly?: boolean
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


  const monacoMarkers = useMonacoMarkers('custom', (value, severity) => {
    if (!value) {
      return []
    }

    const markers: Marker[] = []

    const lines = value.split('\n')
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]

      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      if (!dotEnvEntryRegex.test(line)) {
        markers.push({
          severity: severity.Error,
          message: 'Invalid entry: Missing an "=" sign in this line!',
          startLineNumber: index + 1,
          startColumn: 0,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
        })
        continue
      }
    }

    return markers
  })

  const isInvalid = monacoMarkers.markers.length > 0

  const onSave = useCallback(() => {
    if (props.isReadOnly) {
      console.debug('BulkEditModal save blocked while read-only mode is active')
      return
    }

    if (isInvalid) {
      console.debug('BulkEditModal save blocked because there are invalid entries')
      return
    }

    const asEnvironment = convertDotEnvToEnvironment(value)
    props.onChange?.(asEnvironment)
    props.onClose()
  }, [ value, props, isInvalid ])

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
            <h1 className='text-2xl font-bold'>
              Bulk edit environment variables
            </h1>
            <p className='text-sm opacity-80 font-normal'>
              Bulk edit environment variables, as a dotenv file.
            </p>
          </ModalHeader>
          <ModalBody>
            <Monaco
              value={value}
              onChange={setValue}
              height='500px'
              fileLanguage='ini'
              minimapOverride={false}
              readOnly={props.isReadOnly}
              getMonaco={monacoMarkers.setContext}
            />
          </ModalBody>
          <ModalFooter>
            <Button onPress={onClose}>
              <span>Cancel</span>
            </Button>
            <SaveButton
              onSave={onSave}
              isDisabled={!isInvalid}
              tooltip={isInvalid
                ? 'You must fix the invalid entries before saving.'
                : undefined
              }
            />
          </ModalFooter>
        </>
      )}
    </ModalContent>
  </Modal>
}
