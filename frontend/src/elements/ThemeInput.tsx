// Copyright © 2026 Jalapeno Labs

import type { ThemePreference } from '@common/types'
import type { Selection } from '@react-types/shared'

// User interface
import { Select, SelectItem } from '@heroui/react'
import { FaPalette } from 'react-icons/fa'

type Props = {
  value: ThemePreference
  onChange: (value: ThemePreference) => void
  className?: string
  description?: string
  isDisabled?: boolean
  label?: string
}

const themeOptions = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const satisfies ReadonlyArray<{
  key: ThemePreference,
  label: string,
}>

export function ThemeInput(themeInputProps: Props) {
  const {
    value,
    onChange,
    className,
    description,
    isDisabled,
    label = 'Theme',
  } = themeInputProps

  function handleSelectionChange(selection: Selection) {
    if (selection === 'all') {
      console.debug('ThemeInput received an invalid "all" selection.')
      return
    }

    const selectedKeys = Array.from(selection)
    const [ selectedKey ] = selectedKeys

    if (typeof selectedKey !== 'string') {
      console.debug('ThemeInput received a non-string selection key.', { selectedKey })
      return
    }

    if (!isThemePreference(selectedKey)) {
      console.debug('ThemeInput received an unknown theme preference.', { selectedKey })
      return
    }

    onChange(selectedKey)
  }

  return <Select
    id='theme'
    className={className}
    description={description}
    isDisabled={isDisabled}
    label={label}
    startContent={<FaPalette className='opacity-60' />}
    selectedKeys={[ value ]}
    disallowEmptySelection
    onSelectionChange={handleSelectionChange}
  >{
      themeOptions.map((themeOption) => (
        <SelectItem key={themeOption.key}>
          {themeOption.label}
        </SelectItem>
      ))
    }</Select>
}

function isThemePreference(value: string): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}
