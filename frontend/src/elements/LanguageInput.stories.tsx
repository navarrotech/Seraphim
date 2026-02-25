// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Core
import { useEffect, useState } from 'react'

// Misc
import { USER_LANGUAGE_OPTIONS } from '@common/constants'
import { LanguageInput } from './LanguageInput'

type UserLanguage = (typeof USER_LANGUAGE_OPTIONS)[number]
type LanguageInputProps = ComponentProps<typeof LanguageInput>

function handleLanguageInput(value: UserLanguage) {
  console.debug('LanguageInput story arg onChange triggered.', { value })
}

const meta = {
  title: 'Elements/LanguageInput',
  component: LanguageInput,
  args: {
    value: 'auto',
    description: 'Select the transcription language for recordings.',
    onChange: handleLanguageInput,
  },
} satisfies Meta<typeof LanguageInput>

export default meta

type Story = StoryObj<typeof meta>

function LanguageInputStory(args: LanguageInputProps) {
  const [ value, setValue ] = useState<UserLanguage>(args.value)

  useEffect(() => {
    setValue(args.value)
  }, [ args.value ])

  function handleChange(newValue: UserLanguage) {
    setValue(newValue)
  }

  return <LanguageInput
    { ...args }
    value={value}
    onChange={handleChange}
  />
}

export const Default: Story = {
  render: LanguageInputStory,
}

export const Disabled: Story = {
  render: LanguageInputStory,
  args: {
    isDisabled: true,
  },
}
