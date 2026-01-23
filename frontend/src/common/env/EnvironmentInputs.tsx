// Copyright © 2026 Jalapeno Labs

import type { Environment } from '@common/schema'

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
import { DeleteIcon, EditBulkIcon, PlusIcon } from '@frontend/common/IconNexus'
import { DisplayErrors } from '../DisplayErrors'

type Props = {
  id: string
  items: Environment[]
  onChange: (env: Environment[]) => void
  firstKeyPlaceholder?: string
  firstValuePlaceholder?: string
  className?: string
  isDisabled?: boolean
  invalidFieldKey?: string
  invalidFields?: Record<string, string[]>
}

export function EnvironmentInputs(props: Props) {
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure()

  const {
    items,
    // onChange is very likely to not be memoized, it's not that important to be memoized
    // So don't use it in the deps array
    onChange,
    isDisabled = false,
  } = props

  const onValue = useCallback((index: number, key: keyof Environment, value: string) => {
    const newEnv = [ ...items ]
    newEnv[index] = { ...newEnv[index], [key]: value }
    onChange(newEnv)
  }, [ items ])

  const addEntry = useCallback(() => {
    const newEnv = [ ...items, { key: '', value: '' }]
    onChange(newEnv)
  }, [ items ])

  const removeEntry = useCallback((index: number) => {
    const newEnv = items.filter((_, i) => i !== index)
    onChange(newEnv)
  }, [ items ])

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
    { items.map((entry, index) => <div key={index} className='level-centered items-start compact'>
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
          <EditBulkIcon />
        </span>
        <span>Bulk Edit</span>
      </Button>
    </div>

    <BulkEditModal
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      onOpenChange={onOpenChange}
      environment={items}
      onChange={onChange}
    />
  </div>
}
