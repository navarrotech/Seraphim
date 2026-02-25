// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Misc
import { SaveButton } from './SaveButton'

type SaveButtonProps = ComponentProps<typeof SaveButton>

const meta = {
  title: 'Elements/SaveButton',
  component: SaveButton,
} satisfies Meta<typeof SaveButton>

export default meta

type Story = StoryObj<typeof meta>

function handleSave() {
  console.debug('SaveButton story triggered onSave.')
}

function SaveButtonStory(args: SaveButtonProps) {
  return <SaveButton {...args} />
}

export const Ready: Story = {
  render: SaveButtonStory,
  args: {
    isDirty: true,
    isDisabled: false,
    isLoading: false,
    onSave: handleSave,
  },
}

export const Disabled: Story = {
  render: SaveButtonStory,
  args: {
    isDirty: false,
    isDisabled: true,
    isLoading: false,
    onSave: handleSave,
  },
}

export const Loading: Story = {
  render: SaveButtonStory,
  args: {
    isDirty: true,
    isDisabled: false,
    isLoading: true,
    onSave: handleSave,
  },
}
