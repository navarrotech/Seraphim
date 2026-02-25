// Copyright © 2026 Jalapeno Labs

import type { Selection } from '@react-types/shared'

// User interface
import { Select, SelectItem } from '@heroui/react'
import { FaGlobeAmericas } from 'react-icons/fa'

// Misc
import { USER_LANGUAGE_OPTIONS } from '@common/constants'

type UserLanguage = (typeof USER_LANGUAGE_OPTIONS)[number]

type Props = {
  value: UserLanguage
  onChange: (value: UserLanguage) => void
  className?: string
  description?: string
  errorMessage?: string
  isDisabled?: boolean
  label?: string
}

const languageLabels = {
  'auto': 'Auto',
  'en-US': 'English (US)',
} as const satisfies Record<UserLanguage, string>

const LanguageSet = new Set(USER_LANGUAGE_OPTIONS)

export function LanguageInput(languageInputProps: Props) {
  const {
    value,
    onChange,
    className,
    description,
    errorMessage,
    isDisabled,
    label = 'Language',
  } = languageInputProps

  function handleSelectionChange(selection: Selection) {
    if (selection === 'all') {
      console.debug('LanguageInput received an invalid "all" selection.')
      return
    }

    const selectedKeys = Array.from(selection)
    const [ selectedKey ] = selectedKeys

    if (!LanguageSet.has(selectedKey as UserLanguage)) {
      console.debug('LanguageInput received an unknown language option.', { selectedKey })
      return
    }

    onChange(selectedKey as UserLanguage)
  }

  return <Select
    id='language'
    className={className}
    description={description}
    errorMessage={errorMessage}
    isDisabled={isDisabled}
    isInvalid={Boolean(errorMessage)}
    label={label}
    startContent={<FaGlobeAmericas className='opacity-60' />}
    selectedKeys={[ value ]}
    disallowEmptySelection
    onSelectionChange={handleSelectionChange}
  >{
      USER_LANGUAGE_OPTIONS.map((languageOption) => (
        <SelectItem key={languageOption}>
          {languageLabels[languageOption]}
        </SelectItem>
      ))
    }</Select>
}
