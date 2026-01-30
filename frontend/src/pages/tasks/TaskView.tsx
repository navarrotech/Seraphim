// Copyright © 2026 Jalapeno Labs

import type { Message } from '@prisma/client'

// Core
import { useState } from 'react'

// User interface
import { Button, Card, Skeleton, Textarea } from '@heroui/react'

type Props = {
  messages: Message[]
  taskName: string
  isLoading?: boolean
}

type TaskTabId = 'conversation' | 'logs' | 'files'

type TaskTab = {
  id: TaskTabId
  label: string
}

const taskTabs: TaskTab[] = [
  {
    id: 'conversation',
    label: 'Conversation',
  },
  {
    id: 'logs',
    label: 'Logs',
  },
  {
    id: 'files',
    label: 'Files',
  },
]

function isUserMessage(message: Message) {
  return message.role === 'user'
}

function getMessageLabel(message: Message) {
  if (message.role === 'user') {
    return 'You'
  }

  if (message.role === 'assistant') {
    return 'Seraphim'
  }

  if (message.role === 'system') {
    return 'System'
  }

  console.debug('TaskView received an unsupported message role', {
    role: message.role,
    messageId: message.id,
  })

  return 'Message'
}

function getSkeletonWidths() {
  return [
    'w-3/4',
    'w-11/12',
    'w-2/3',
    'w-5/6',
    'w-4/5',
  ] as const
}

export function TaskView(props: Props) {
  const { messages, taskName, isLoading = false } = props
  const [ draftMessage, setDraftMessage ] = useState<string>('')
  const [ activeTabId, setActiveTabId ] = useState<TaskTabId>('conversation')
  const skeletonWidths = getSkeletonWidths()

  function handleSendMessage() {
    const trimmedMessage = draftMessage.trim()
    if (!trimmedMessage) {
      console.debug('TaskView cannot send an empty message')
      return
    }

    console.debug('TaskView send message is not wired yet', { trimmedMessage })
  }

  function handleTabSelection(tabId: TaskTabId) {
    if (tabId !== 'conversation') {
      console.debug('TaskView tab is not available yet', { tabId })
    }

    setActiveTabId(tabId)
  }

  function renderTab(tab: TaskTab) {
    const isActive = tab.id === activeTabId

    return <Button
      key={tab.id}
      variant={isActive ? 'solid' : 'light'}
      onPress={() => {
        handleTabSelection(tab.id)
      }}
    >
      <span>{tab.label}</span>
    </Button>
  }

  function renderTabContent() {
    if (activeTabId !== 'conversation') {
      return <Card className='p-6 text-center'>
        <p className='opacity-70'>This tab is coming soon.</p>
      </Card>
    }

    return <Card className='flex-1 overflow-y-auto p-4'>
      <div className='relaxed'>
        {isLoading && (
          <div className='relaxed'>
            {skeletonWidths.map((width) => (
              <div key={width} className='relaxed'>
                <Skeleton className='h-3 w-20 rounded-md' />
                <Skeleton className={`h-4 ${width} rounded-md`} />
              </div>
            ))}
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className='relaxed text-center'>
            <p className='opacity-70'>No messages yet. Send one below to start.</p>
          </div>
        )}
        {!isLoading && messages.length > 0 && (
          <div className='relaxed'>
            {messages.map((message) => {
              const isUser = isUserMessage(message)
              const label = getMessageLabel(message)

              return <div
                key={message.id}
                className={`relaxed ${isUser ? 'text-right' : ''}`}
              >
                <div className='text-xs uppercase tracking-wide opacity-50'>
                  {label}
                </div>
                <p className='whitespace-pre-wrap text-sm leading-relaxed'>
                  {message.content}
                </p>
              </div>
            })}
          </div>
        )}
      </div>
    </Card>
  }

  return <div className='flex h-full flex-col'>
    <div className='relaxed'>
      <h2 className='text-2xl'>
        <strong>{
          taskName
        }</strong>
      </h2>
      <p className='opacity-70'>Conversation history</p>
    </div>
    <div className='level'>
      <div className='level-left gap-2'>
        {taskTabs.map(renderTab)}
      </div>
    </div>
    {renderTabContent()}
    <div className='relaxed pt-4'>
      <Textarea
        label='Message'
        placeholder='Send a message...'
        minRows={3}
        value={draftMessage}
        onValueChange={setDraftMessage}
        isDisabled={isLoading}
      />
      <div className='level-right'>
        <Button
          color='primary'
          onPress={handleSendMessage}
          isDisabled={isLoading || draftMessage.trim().length === 0}
        >
          <span>Send Message</span>
        </Button>
      </div>
    </div>
  </div>
}
