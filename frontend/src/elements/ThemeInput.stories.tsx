// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { ThemePreference } from '@common/types'

// Core
import { useEffect, useState } from 'react'

// Misc
import { ThemeInput } from './ThemeInput'

type ThemeInputProps = ComponentProps<typeof ThemeInput>

function handleThemeInput(value: ThemePreference) {
  console.debug('ThemeInput story arg onChange triggered.', { value })
}

const meta = {
  title: 'Elements/ThemeInput',
  component: ThemeInput,
  args: {
    value: 'system',
    description: 'Follow the system theme, or force a specific color mode.',
    onChange: handleThemeInput,
  },
} satisfies Meta<typeof ThemeInput>

export default meta

type Story = StoryObj<typeof meta>

function ThemeInputStory(args: ThemeInputProps) {
  const [ value, setValue ] = useState<ThemePreference>(args.value)

  useEffect(() => {
    setValue(args.value)
  }, [ args.value ])

  function handleChange(newValue: ThemePreference) {
    setValue(newValue)
  }

  return <ThemeInput
    { ...args }
    value={value}
    onChange={handleChange}
  />
}

export const Default: Story = {
  render: ThemeInputStory,
}

export const Disabled: Story = {
  render: ThemeInputStory,
  args: {
    isDisabled: true,
  },
}
