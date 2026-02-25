// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Misc
import { Card } from './Card'

type CardProps = ComponentProps<typeof Card>

function handleCardClick() {
  console.debug('Card story placeholder clicked.')
}

const meta = {
  title: 'Elements/Card',
  component: Card,
  args: {
    label: 'Workspace status',
    children: <button type='button' onClick={handleCardClick}>
      <span>Storybook placeholder content</span>
    </button>,
  },
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

function CardStory(args: CardProps) {
  return <div className='max-w-xl'>
    <Card {...args}>
      <div className='relaxed'>
        <p className='text-lg font-semibold'>{
          'Build is healthy'
        }</p>
        <p className='opacity-80'>{
          'Last validated 12 minutes ago with green checks across pipelines.'
        }</p>
      </div>
    </Card>
  </div>
}

export const Default: Story = {
  render: CardStory,
}

export const WithoutLabel: Story = {
  render: CardStory,
  args: {
    label: undefined,
  },
}
