// Copyright © 2026 Jalapeno Labs

import type { ConnectionRecord } from '@frontend/lib/types/connectionTypes'
import type { LlmConnectionType } from '@prisma/client'

// Core
import { useState } from 'react'

// Redux
import { connectionActions } from '@frontend/framework/redux/stores/connections'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Chip, Tooltip } from '@heroui/react'

// Misc
import { DeleteIcon, EditBulkIcon, PlusIcon } from '@frontend/common/IconNexus'
import { listConnections, updateConnection } from '@frontend/lib/routes/connectionRoutes'
import { CreateConnectionDrawer } from './CreateConnectionDrawer'

type ConnectionDisplay = {
  label: string
  logoUrl: string
}

const connectionDisplayByType: Record<LlmConnectionType, ConnectionDisplay> = {
  OPENAI_API_KEY: {
    label: 'OpenAI (API key)',
    logoUrl: '/llms/openai.png',
  },
  OPENAI_LOGIN_TOKEN: {
    label: 'OpenAI (Login token)',
    logoUrl: '/llms/openai.png',
  },
  KIMI_API_KEY: {
    label: 'Kimi K2 (API key)',
    logoUrl: '/llms/kimi-k2.png',
  },
}

function getConnectionDisplay(connectionType: LlmConnectionType) {
  const display = connectionDisplayByType[connectionType]

  if (!display) {
    console.debug('Connections received an unsupported connection type', {
      connectionType,
    })
  }

  return display || {
    label: connectionType,
    logoUrl: '/openai-logo.png',
  }
}

function getConnectionName(connection: ConnectionRecord) {
  if (connection.name) {
    return connection.name
  }

  const display = getConnectionDisplay(connection.type)
  return display.label
}

function getUsageLabel(connection: ConnectionRecord) {
  if (connection.tokenLimit) {
    return `${connection.tokensUsed} / ${connection.tokenLimit} tokens`
  }

  return `${connection.tokensUsed} tokens`
}

export function Connections() {
  const connections = useSelector((state) => state.connections.items)
  const [ isUpdatingDefault, setIsUpdatingDefault ] = useState(false)
  const [ isCreateDrawerOpen, setIsCreateDrawerOpen ] = useState(false)
  const [ drawerMode, setDrawerMode ] = useState<'create' | 'edit'>('create')
  const [ editingConnection, setEditingConnection ] = useState<ConnectionRecord | null>(null)

  async function refreshConnections() {
    try {
      const response = await listConnections()
      dispatch(
        connectionActions.setConnections(response.connections),
      )
    }
    catch (error) {
      console.debug('Connections failed to refresh connections', { error })
    }
  }

  async function handleSetDefault(connection: ConnectionRecord) {
    if (connection.isDefault) {
      console.debug('Connections default update ignored because already default', {
        connectionId: connection.id,
      })
      return
    }

    setIsUpdatingDefault(true)

    try {
      await updateConnection(connection.id, {
        isDefault: true,
      })
      await refreshConnections()
    }
    catch (error) {
      console.debug('Connections failed to set default', {
        error,
        connectionId: connection.id,
      })
    }
    finally {
      setIsUpdatingDefault(false)
    }
  }

  function handleCreateConnection() {
    setDrawerMode('create')
    setEditingConnection(null)
    setIsCreateDrawerOpen(true)
  }

  function handleCreateDrawerOpenChange(isOpen: boolean) {
    setIsCreateDrawerOpen(isOpen)
    if (!isOpen) {
      setEditingConnection(null)
      setDrawerMode('create')
    }
  }

  function handleEditConnection(connection: ConnectionRecord) {
    setEditingConnection(connection)
    setDrawerMode('edit')
    setIsCreateDrawerOpen(true)
  }

  function handleDeleteConnection(connection: ConnectionRecord) {
    console.debug('Connections delete placeholder', {
      connectionId: connection.id,
    })
  }

  function renderConnectionRow(connection: ConnectionRecord) {
    const display = getConnectionDisplay(connection.type)
    const connectionName = getConnectionName(connection)
    const usageLabel = getUsageLabel(connection)

    let defaultChip = null
    if (connection.isDefault) {
      defaultChip = <Chip color='primary' size='sm'>
        <span>Default</span>
      </Chip>
    }

    let preferredModel = connection.preferredModel
    if (!preferredModel) {
      preferredModel = 'Not set'
    }

    return <div
      key={connection.id}
      className='group relative grid grid-cols-12 items-center gap-4 px-4 py-4'
    >
      <div className='col-span-4 flex items-center gap-3'>
        <div className='h-10 w-10 overflow-hidden rounded-full border border-black/10'>
          <img
            src={display.logoUrl}
            alt={`${display.label} logo`}
            className='h-full w-full object-cover'
          />
        </div>
        <div>
          <div className='flex items-center gap-2 text-lg'>
            <span>{connectionName}</span>{
              defaultChip
            }</div>
          <div className='text-sm opacity-70'>{display.label}</div>
        </div>
      </div>
      <div className='col-span-3'>
        <div className='text-sm opacity-80'>{preferredModel}</div>
      </div>
      <div className='col-span-3'>
        <div className='text-sm opacity-80'>{usageLabel}</div>
      </div>
      <div className='col-span-2'>
        <div className='flex items-center justify-end gap-2'>
          <Button
            size='sm'
            variant='flat'
            color='primary'
            isDisabled={connection.isDefault || isUpdatingDefault}
            onPress={() => handleSetDefault(connection)}
          >
            <span>Make Default</span>
          </Button>
          <Tooltip content='Edit connection'>
            <Button
              size='sm'
              variant='light'
              isIconOnly
              onPress={() => handleEditConnection(connection)}
            >
              <span className='icon'>
                <EditBulkIcon />
              </span>
            </Button>
          </Tooltip>
          <Tooltip content='Delete connection'>
            <Button
              size='sm'
              variant='light'
              isIconOnly
              onPress={() => handleDeleteConnection(connection)}
            >
              <span className='icon'>
                <DeleteIcon />
              </span>
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  }

  if (!connections || connections.length === 0) {
    return <section className='container p-6'>
      <div className='relaxed'>
        <h2 className='text-2xl'>
          <strong>Connections</strong>
        </h2>
        <p className='opacity-80'>Manage your preferred LLMs.</p>
      </div>
    <Card className='relaxed p-6'>
        <div className='relaxed'>
          <div className='text-xl'>No connections yet.</div>
          <p className='opacity-80'>
            Add an LLM connection to start using AI-assisted workflows.
          </p>
        </div>
        <Button color='primary' onPress={handleCreateConnection}>
          <span className='icon text-lg'>
            <PlusIcon />
          </span>
          <span>Create Connection</span>
        </Button>
      </Card>
      <CreateConnectionDrawer
        isOpen={isCreateDrawerOpen}
        isDisabled={false}
        mode={drawerMode}
        connection={editingConnection}
        onOpenChange={handleCreateDrawerOpenChange}
      />
    </section>
  }

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='text-2xl'>
          <strong>Connections</strong>
        </h2>
        <p className='opacity-80'>Manage your preferred LLMs.</p>
      </div>
      <Button color='primary' onPress={handleCreateConnection}>
        <span className='icon text-lg'>
          <PlusIcon />
        </span>
        <span>Create Connection</span>
      </Button>
    </div>
    <Card className='relaxed p-2'>
      <div className='grid grid-cols-12 gap-4 px-4 py-3 text-sm opacity-70'>
        <div className='col-span-4'>Connection</div>
        <div className='col-span-3'>Preferred Model</div>
        <div className='col-span-3'>Usage</div>
        <div className='col-span-2 text-right'>Actions</div>
      </div>
      <div className='divide-y'>{
          connections.map(renderConnectionRow)
        }</div>
    </Card>
    <CreateConnectionDrawer
      isOpen={isCreateDrawerOpen}
      isDisabled={false}
      mode={drawerMode}
      connection={editingConnection}
      onOpenChange={handleCreateDrawerOpenChange}
    />
  </section>
}
