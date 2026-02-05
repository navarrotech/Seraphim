// Copyright © 2026 Jalapeno Labs

import type { LlmRecord } from '@frontend/lib/types/llmTypes'
import type { LlmType } from '@prisma/client'

// Core
import { useState } from 'react'

// Redux
import { llmActions } from '@frontend/framework/redux/stores/llms'
import { dispatch, useSelector } from '@frontend/framework/store'

// User interface
import { Button, Card, Chip, Tooltip } from '@heroui/react'

// Misc
import { DeleteIcon, EditBulkIcon, PlusIcon } from '@frontend/common/IconNexus'
import { listLlms, updateLlm } from '@frontend/lib/routes/llmRoutes'
import { CreateLlmDrawer } from './CreateLlmDrawer'

type LlmDisplay = {
  label: string
  logoUrl: string
}

const llmDisplayByType: Record<LlmType, LlmDisplay> = {
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

function getLlmDisplay(llmType: LlmType) {
  const display = llmDisplayByType[llmType]

  if (!display) {
    console.debug('LLMs received an unsupported LLM type', {
      llmType,
    })
  }

  return display || {
    label: llmType,
    logoUrl: '/openai-logo.png',
  }
}

function getLlmName(llm: LlmRecord) {
  if (llm.name) {
    return llm.name
  }

  const display = getLlmDisplay(llm.type)
  return display.label
}

function getUsageLabel(llm: LlmRecord) {
  if (llm.tokenLimit) {
    return `${llm.tokensUsed} / ${llm.tokenLimit} tokens`
  }

  return `${llm.tokensUsed} tokens`
}

export function Llms() {
  const llms = useSelector((state) => state.llms.items)
  const [ isUpdatingDefault, setIsUpdatingDefault ] = useState(false)
  const [ isCreateDrawerOpen, setIsCreateDrawerOpen ] = useState(false)
  const [ drawerMode, setDrawerMode ] = useState<'create' | 'edit'>('create')
  const [ editingLlm, setEditingLlm ] = useState<LlmRecord | null>(null)

  async function refreshLlms() {
    try {
      const response = await listLlms()
      dispatch(
        llmActions.setLlms(response.llms),
      )
    }
    catch (error) {
      console.debug('LLMs failed to refresh LLMs', { error })
    }
  }

  async function handleSetDefault(llm: LlmRecord) {
    if (llm.isDefault) {
      console.debug('LLMs default update ignored because already default', {
        llmId: llm.id,
      })
      return
    }

    setIsUpdatingDefault(true)

    try {
      await updateLlm(llm.id, {
        isDefault: true,
      })
      await refreshLlms()
    }
    catch (error) {
      console.debug('LLMs failed to set default', {
        error,
        llmId: llm.id,
      })
    }
    finally {
      setIsUpdatingDefault(false)
    }
  }

  function handleCreateLlm() {
    setDrawerMode('create')
    setEditingLlm(null)
    setIsCreateDrawerOpen(true)
  }

  function handleCreateDrawerOpenChange(isOpen: boolean) {
    setIsCreateDrawerOpen(isOpen)
    if (!isOpen) {
      setEditingLlm(null)
      setDrawerMode('create')
    }
  }

  function handleEditLlm(llm: LlmRecord) {
    setEditingLlm(llm)
    setDrawerMode('edit')
    setIsCreateDrawerOpen(true)
  }

  function handleDeleteLlm(llm: LlmRecord) {
    console.debug('LLMs delete placeholder', {
      llmId: llm.id,
    })
  }

  function renderLlmRow(llm: LlmRecord) {
    const display = getLlmDisplay(llm.type)
    const llmName = getLlmName(llm)
    const usageLabel = getUsageLabel(llm)

    let defaultChip = null
    if (llm.isDefault) {
      defaultChip = <Chip color='primary' size='sm'>
        <span>Default</span>
      </Chip>
    }

    let preferredModel = llm.preferredModel
    if (!preferredModel) {
      preferredModel = 'Not set'
    }

    return <div
      key={llm.id}
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
            <span>{llmName}</span>{
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
            isDisabled={llm.isDefault || isUpdatingDefault}
            onPress={() => handleSetDefault(llm)}
          >
            <span>Make Default</span>
          </Button>
          <Tooltip content='Edit LLM'>
            <Button
              size='sm'
              variant='light'
              isIconOnly
              onPress={() => handleEditLlm(llm)}
            >
              <span className='icon'>
                <EditBulkIcon />
              </span>
            </Button>
          </Tooltip>
          <Tooltip content='Delete LLM'>
            <Button
              size='sm'
              variant='light'
              isIconOnly
              onPress={() => handleDeleteLlm(llm)}
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

  if (!llms || llms.length === 0) {
    return <section className='container p-6'>
      <div className='relaxed'>
        <h2 className='text-2xl'>
          <strong>LLMs</strong>
        </h2>
        <p className='opacity-80'>Manage your preferred LLMs.</p>
      </div>
    <Card className='relaxed p-6'>
        <div className='relaxed'>
          <div className='text-xl'>No LLMs yet.</div>
          <p className='opacity-80'>
            Add an LLM to start using AI-assisted workflows.
          </p>
        </div>
        <Button color='primary' onPress={handleCreateLlm}>
          <span className='icon text-lg'>
            <PlusIcon />
          </span>
          <span>Create LLM</span>
        </Button>
      </Card>
      <CreateLlmDrawer
        isOpen={isCreateDrawerOpen}
        isDisabled={false}
        mode={drawerMode}
        llm={editingLlm}
        onOpenChange={handleCreateDrawerOpenChange}
      />
    </section>
  }

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='text-2xl'>
          <strong>LLMs</strong>
        </h2>
        <p className='opacity-80'>Manage your preferred LLMs.</p>
      </div>
      <Button color='primary' onPress={handleCreateLlm}>
        <span className='icon text-lg'>
          <PlusIcon />
        </span>
        <span>Create LLM</span>
      </Button>
    </div>
    <Card className='relaxed p-2'>
      <div className='grid grid-cols-12 gap-4 px-4 py-3 text-sm opacity-70'>
        <div className='col-span-4'>LLM</div>
        <div className='col-span-3'>Preferred Model</div>
        <div className='col-span-3'>Usage</div>
        <div className='col-span-2 text-right'>Actions</div>
      </div>
      <div className='divide-y'>{
          llms.map(renderLlmRow)
        }</div>
    </Card>
    <CreateLlmDrawer
      isOpen={isCreateDrawerOpen}
      isDisabled={false}
      mode={drawerMode}
      llm={editingLlm}
      onOpenChange={handleCreateDrawerOpenChange}
    />
  </section>
}
