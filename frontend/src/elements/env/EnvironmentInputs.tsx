// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema/common'

// Core
import { useCallback } from 'react'

// UI
import {
  Input,
  Button,
  Tooltip,
  useDisclosure,
} from '@heroui/react'
import { BulkEditModal } from './BulkEditModal'
import { DeleteIcon, EditIcon, PlusIcon } from '@frontend/elements/graphics/IconNexus'
import { DisplayErrors } from '../DisplayErrors'

type Props = {
  id: string
  entries: Environment[]
  onEntriesChange: (entries: Environment[]) => void
  firstKeyPlaceholder?: string
  firstValuePlaceholder?: string
  className?: string
  isDisabled?: boolean
  invalidFieldKey?: string
  invalidFields?: Record<string, string[]>
}

const defaultItems: Environment[] = [{ key: '', value: '' }]

export function EnvironmentInputs(props: Props) {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  const {
    // onChange is very likely to not be memoized, it's not that important to be memoized
    // So don't use it in the deps array
    onEntriesChange,
    isDisabled = false,
  } = props

  const entries = !props.entries?.length
    ? defaultItems
    : props.entries

  const onValue = useCallback((index: number, key: keyof Environment, value: string) => {
    const newEnv = [ ...entries ]
    newEnv[index] = { ...newEnv[index], [key]: value }
    onEntriesChange(newEnv)
  }, [ entries ])

  const addEntry = useCallback(() => {
    const newEnv = [ ...entries, { key: '', value: '' }]
    onEntriesChange(newEnv)
  }, [ entries ])

  const removeEntry = useCallback((index: number) => {
    const newEnv = entries.filter((_, i) => i !== index)
    onEntriesChange(newEnv)
  }, [ entries ])

  return <div id={props.id} className={props.className}>
    {/* Header */}
    <div key='header' className='level-centered items-start text-sm mb-2'>
      <div className='w-full'>
        <label>Key</label>
      </div>
      <div className='w-full'>
        <label>Value</label>
      </div>
      <div className='w-24'/>
    </div>

    {/* Items list */}
    { entries.map((entry, index) => <div key={index} className='level-centered items-start compact'>
      <div className='w-full'>
        <Input
          id={`${props.id}-${index}-key`}
          placeholder={index === 0 ? props.firstKeyPlaceholder : undefined}
          value={entry.key}
          onValueChange={(value) => onValue(index, 'key', value)}
          isDisabled={isDisabled}
          errorMessage={<DisplayErrors errors={props.invalidFields?.[`${props.invalidFieldKey}.${index}.key`]} />}
          isInvalid={!!props.invalidFields?.[`${props.invalidFieldKey}.${index}.key`]}
        />
      </div>
      <div className='w-full'>
        <Input
          id={`${props.id}-${index}-value`}
          placeholder={index === 0 ? props.firstValuePlaceholder : undefined}
          value={entry.value}
          onValueChange={(value) => onValue(index, 'value', value)}
          isDisabled={isDisabled}
          errorMessage={<DisplayErrors errors={props.invalidFields?.[`${props.invalidFieldKey}.${index}.value`]} />}
          isInvalid={!!props.invalidFields?.[`${props.invalidFieldKey}.${index}.value`]}
        />
      </div>
      <Tooltip content='Delete Variable'>
        <div>
          <Button
            isIconOnly
            id={`${props.id}-${index}-remove`}
            variant='light'
            onPress={() => removeEntry(index)}
            className='opacity-50 hover:opacity-100'
            isDisabled={isDisabled}
          >
            <span className='icon'>
              <DeleteIcon />
            </span>
          </Button>
        </div>
      </Tooltip>
    </div>)
    }

    <div key='footer' className='flex items-start compact'>
      <Button
        id={`${props.id}-add`}
        variant='light'
        onPress={addEntry}
        isDisabled={isDisabled}
      >
        <span className='icon'>
          <PlusIcon />
        </span>
        <span>Add Variable</span>
      </Button>
      <Button
        id={`${props.id}-bulk-edit`}
        variant='light'
        onPress={onOpen}
        isDisabled={isDisabled}
      >
        <span className='icon'>
          <EditIcon />
        </span>
        <span>Bulk Edit</span>
      </Button>
    </div>

    <BulkEditModal
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      onOpenChange={onOpenChange}
      environment={entries}
      onChange={onEntriesChange}
    />
  </div>
}
