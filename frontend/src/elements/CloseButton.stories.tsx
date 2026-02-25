// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Misc
import { CloseButton } from './CloseButton'

type CloseButtonProps = ComponentProps<typeof CloseButton>

const meta = {
  title: 'Elements/CloseButton',
  component: CloseButton,
} satisfies Meta<typeof CloseButton>

export default meta

type Story = StoryObj<typeof meta>

function handleClose() {
  console.debug('CloseButton story triggered onClose.')
}

function CloseButtonStory(args: CloseButtonProps) {
  return <div className='inline-flex items-center rounded bg-content2 p-2'>
    <CloseButton {...args} />
  </div>
}

export const Default: Story = {
  render: CloseButtonStory,
  args: {
    isDisabled: false,
    onClose: handleClose,
  },
}

export const Disabled: Story = {
  render: CloseButtonStory,
  args: {
    isDisabled: true,
    onClose: handleClose,
  },
}
