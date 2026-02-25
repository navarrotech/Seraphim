// Copyright © 2026 Jalapeno Labs

import type { LlmWithRateLimits } from '@common/types'

// Core
import { useState, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'

// Redux
import { useSelector } from '@frontend/framework/store'

// User Interface
import { ViewLLMPage } from './ViewLLMPage'
import { Card } from '@frontend/elements/Card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import { SiOpenai } from 'react-icons/si'
import { PlusIcon } from '@frontend/elements/graphics/IconNexus'

export function LLMsPage() {
  // Input
  const items = useSelector((state) => state.llms.items)

  // State
  const [ selectedItem, select ] = useState<'new' | LlmWithRateLimits | null>(null)

  // Actions
  const deselectAll = useCallback(() => {
    select(null)
  }, [])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, { preventDefault: true })

  return <article className='relaxed'>
    <div className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>LLMs</h1>
      </div>
      <div className='level-right'>
        <Dropdown placement='bottom-end'>
          <DropdownTrigger>
            <Button
              color='primary'
            >
              <span>Add LLM</span>
              <span className='icon'>
                <PlusIcon />
              </span>
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label='Static Actions'>
            <DropdownItem
              key='openai'
              onPress={() => {
                select('new')
              }}
            >
              <div className='level-left w-full'>
                <span className='icon'>
                  <SiOpenai className='icon' />
                </span>
                <span>OpenAI</span>
              </div>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
    <Card>{
      !items?.length
        ? <>
          <p className='opacity-70'>No LLMs configured yet.</p>
        </>
        : <>
          <div className='level-centered'>
            <ul className='flex-1'>{
            items.map((languageModel) => (
              <LanguageModelItem
                key={languageModel.id}
                languageModel={languageModel}
                isSelected={languageModel.id === selectedItem}
                onSelect={select}
              />
            ))
          }</ul>
          { selectedItem
            ? selectedItem === 'new'
              ? <ViewLLMPage />
              : <ViewLLMPage languageModel={selectedItem} />
            : <></>
          }
        </div>
        </>
    }</Card>
  </article>
}

type LanguageModelItemProps = {
  languageModel: LlmWithRateLimits
  isSelected: boolean
  onSelect: (languageModel: LlmWithRateLimits) => void
}

function LanguageModelItem(props: LanguageModelItemProps) {
  const { languageModel, isSelected, onSelect } = props

  let displayName = languageModel.name
  if (!displayName) {
    displayName = languageModel.type
  }

  let modelDetails = 'No preferred model set'
  if (languageModel.preferredModel) {
    modelDetails = languageModel.preferredModel
  }

  let defaultLabelContent = null
  if (languageModel.isDefault) {
    defaultLabelContent = <div className='mt-2 text-xs opacity-70'>Default</div>
  }

  const className = [
    'w-full rounded p-4 cursor-pointer transition border border-divider',
    props.isSelected && 'border border-primary/60 ring-2 ring-primary/40',
  ].filter(Boolean).join(' ')

  return <li className='w-full'>
    <button
      id={languageModel.id}
      className={className}
      role='button'
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => {
        onSelect(languageModel)
      }}
    >
      <div className='level'>
        <div>
          <div className='text-lg font-semibold'>{displayName}</div>
          <div className='opacity-70 text-sm'>{modelDetails}</div>
        </div>
        <div className='text-sm opacity-70'>{languageModel.type}</div>
      </div>
      {defaultLabelContent}
    </button>
  </li>
}
