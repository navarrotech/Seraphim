// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Misc
import { ResetButton } from './ResetButton'

type ResetButtonProps = ComponentProps<typeof ResetButton>

const meta = {
  title: 'Elements/ResetButton',
  component: ResetButton,
} satisfies Meta<typeof ResetButton>

export default meta

type Story = StoryObj<typeof meta>

function handleReset() {
  console.debug('ResetButton story triggered onReset.')
}

function ResetButtonStory(args: ResetButtonProps) {
  return <ResetButton {...args} />
}

export const Ready: Story = {
  render: ResetButtonStory,
  args: {
    isDirty: true,
    isDisabled: false,
    onReset: handleReset,
  },
}

export const Disabled: Story = {
  render: ResetButtonStory,
  args: {
    isDirty: false,
    isDisabled: true,
    onReset: handleReset,
  },
}
