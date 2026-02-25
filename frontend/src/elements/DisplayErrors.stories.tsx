// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Misc
import { DisplayErrors } from './DisplayErrors'

type DisplayErrorsProps = ComponentProps<typeof DisplayErrors>

const meta = {
  title: 'Elements/DisplayErrors',
  component: DisplayErrors,
} satisfies Meta<typeof DisplayErrors>

export default meta

type Story = StoryObj<typeof meta>

function DisplayErrorsStory(args: DisplayErrorsProps) {
  return <div className='max-w-xl'>
    <DisplayErrors {...args} />
  </div>
}

export const SingleMessage: Story = {
  render: DisplayErrorsStory,
  args: {
    errors: 'Repository URL is missing.',
  },
}

export const MultipleMessages: Story = {
  render: DisplayErrorsStory,
  args: {
    errors: [
      'Name is required.',
      'Container image must be a valid tag.',
      'Setup script includes invalid syntax.',
    ],
  },
}
