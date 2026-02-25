// Copyright © 2026 Jalapeno Labs

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { Environment } from '@common/schema/common'

// Core
import { useState } from 'react'

// User interface
import { Button } from '@heroui/react'

// Misc
import { BulkEditModal } from './BulkEditModal'

type BulkEditModalProps = ComponentProps<typeof BulkEditModal>

const sampleEnvironment: Environment[] = [
  {
    key: 'NODE_ENV',
    value: 'development',
  },
  {
    key: 'API_BASE_URL',
    value: 'https://api.seraphim.app',
  },
  {
    key: 'FEATURE_FLAGS',
    value: 'new-editor,health-checks',
  },
]

function handleBulkEditOpen() {
  console.debug('BulkEditModal story arg onOpen triggered.')
}

function handleBulkEditClose() {
  console.debug('BulkEditModal story arg onClose triggered.')
}

function handleBulkEditOpenChange(isOpen: boolean) {
  console.debug('BulkEditModal story arg onOpenChange triggered.', { isOpen })
}

function handleBulkEditChange(environment: Environment[]) {
  console.debug('BulkEditModal story arg onChange triggered.', { environment })
}

const meta = {
  title: 'Elements/Environment/BulkEditModal',
  component: BulkEditModal,
  args: {
    isOpen: true,
    onOpen: handleBulkEditOpen,
    onClose: handleBulkEditClose,
    onOpenChange: handleBulkEditOpenChange,
    environment: sampleEnvironment,
    onChange: handleBulkEditChange,
  },
} satisfies Meta<typeof BulkEditModal>

export default meta

type Story = StoryObj<typeof meta>

function BulkEditModalStory(args: BulkEditModalProps) {
  const [ isOpen, setIsOpen ] = useState(true)
  const [ environment, setEnvironment ] = useState<Environment[]>(sampleEnvironment)

  function handleOpen() {
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
  }

  function handleChange(nextEnvironment: Environment[]) {
    setEnvironment(nextEnvironment)
  }

  return <div className='relaxed'>
    <Button onPress={handleOpen}>
      <span>Open Bulk Editor</span>
    </Button>
    <BulkEditModal
      { ...args }
      isOpen={isOpen}
      environment={environment}
      onOpen={handleOpen}
      onClose={handleClose}
      onOpenChange={handleOpenChange}
      onChange={handleChange}
    />
  </div>
}

export const Default: Story = {
  render: BulkEditModalStory,
}

export const ReadOnly: Story = {
  render: BulkEditModalStory,
  args: {
    isReadOnly: true,
  },
}
