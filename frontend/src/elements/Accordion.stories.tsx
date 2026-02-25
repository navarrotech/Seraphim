// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

// Misc
import { Accordion } from './Accordion'

type AccordionProps = ComponentProps<typeof Accordion>

const meta = {
  title: 'Elements/Accordion',
  component: Accordion,
  args: {
    id: 'storybook-accordion',
    header: <div className='text-lg font-semibold'>
      <span>Workspace details</span>
    </div>,
    children: <div className='relaxed'>
      <p className='opacity-80'>{
        'Track environment variables, automation steps, and health checks.'
      }</p>
      <p className='opacity-80'>{
        'Use this section to keep launch notes close to the task.'
      }</p>
    </div>,
    defaultExpanded: true,
  },
} satisfies Meta<typeof Accordion>

export default meta

type Story = StoryObj<typeof meta>

function AccordionStory(args: AccordionProps) {
  return <div className='max-w-xl'>
    <Accordion {...args} />
  </div>
}

export const Default: Story = {
  render: AccordionStory,
}

export const Collapsed: Story = {
  render: AccordionStory,
  args: {
    defaultExpanded: false,
  },
}
