// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'
import type { LlmWithRateLimits } from '@common/types'

// Core
import { useState, useCallback } from 'react'
import { useHotkey } from '@frontend/hooks/useHotkey'
import { useConfirm } from '@frontend/hooks/useConfirm'

// Redux
import { useSelector } from '@frontend/framework/store'

// Actions
import { deleteLlm } from '@frontend/routes/llmRoutes'

// User Interface
import { ViewLLMPage } from './ViewLLMPage'
import { Card } from '@frontend/elements/Card'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import { SiOpenai } from 'react-icons/si'
import { PlusIcon, EllipsisIcon, DeleteIcon, EditIcon } from '@frontend/elements/graphics/IconNexus'
import { ListItem } from '../ListItem'
import { EmptyData } from '../EmptyData'

const IconByType = {
  OPENAI_API_KEY: <SiOpenai className='icon' size={38} />,
  OPENAI_LOGIN_TOKEN: <SiOpenai className='icon' size={38} />,
} as const satisfies Record<LlmWithRateLimits['type'], ReactNode>

export function LLMsPage() {
  // Input
  const items = useSelector((state) => state.llms.items)

  // State
  const [ selectedItem, select ] = useState<'new' | LlmWithRateLimits | null>(null)

  // Actions
  const confirm = useConfirm()
  const deselectAll = useCallback(() => {
    select(null)
  }, [])

  // Hotkeys
  useHotkey([ 'Escape' ], deselectAll, { preventDefault: true })

  return <article className='relaxed'>
    <header className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>LLMs</h1>
      </div>
      <div className='level-right'>
        <Dropdown placement='bottom-end'>
          <DropdownTrigger>
            <Button color='primary' className='font-semibold'>
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
    </header>
    <section className='level-centered gap-6'>
      <Card>{
        !items?.length
          ? <EmptyData message='No LLMs configured yet.' />
          : <>
            <ul className='flex-1'>{
              items.map((languageModel) => {
                let isSelected = false
                if (typeof selectedItem === 'object') {
                  isSelected = languageModel.id === selectedItem?.id
                }

                let displayName = languageModel.name
                if (!displayName) {
                  displayName = languageModel.type
                }

                let modelDetails = languageModel.preferredModel
                if (!modelDetails) {
                  modelDetails = 'No preferred model set'
                }

                return <ListItem
                  id={languageModel.id}
                  key={languageModel.id}
                  title={displayName}
                  description={modelDetails}
                  className='hide-until-hover-parent'
                  isSelected={isSelected}
                  onSelect={() => select(languageModel)}
                  startContent={<div>{
                    IconByType[languageModel.type]
                  }</div>}
                  endContent={<Dropdown placement='bottom-end' className='hide-until-hover'>
                    <DropdownTrigger>
                      <Button isIconOnly variant='light'>
                        <span className='icon'>
                          <EllipsisIcon />
                        </span>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label='Static Actions'>
                      <DropdownItem key='edit' onPress={() => select(languageModel)}>
                        <div className='level-left w-full'>
                          <span className='icon'>
                            <EditIcon className='icon' />
                          </span>
                          <span>Edit</span>
                        </div>
                      </DropdownItem>
                      <DropdownItem
                        key='delete'
                        color='danger'
                        onPress={() => confirm({
                          title: 'Delete LLM',
                          message: `Are you sure you want to delete '${displayName}'?`
                            + ' This action cannot be undone.',
                          confirmText: 'Delete',
                          confirmColor: 'danger',
                          onConfirm: async () => {
                            await deleteLlm(languageModel)
                          },
                        })}
                      >
                        <div className='level-left w-full'>
                          <span className='icon'>
                            <DeleteIcon className='icon' />
                          </span>
                          <span>Delete</span>
                        </div>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>}
                />
              })
            }</ul>
          </>
      }</Card>
      { selectedItem
        ? selectedItem === 'new'
          ? <ViewLLMPage />
          : <ViewLLMPage languageModel={selectedItem} />
        : <></>
      }
    </section>
  </article>
}
