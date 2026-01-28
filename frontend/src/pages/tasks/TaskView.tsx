// Copyright © 2026 Jalapeno Labs

import type { Message } from '@prisma/client'

// User interface
import { Card, Textarea } from '@heroui/react'

type Props = {
  messages: Message[]
  taskName: string
}

function isUserMessage(message: Message) {
  return message.role === 'user'
}

export function TaskView(props: Props) {
  const { messages, taskName } = props

  return <div className='flex h-full flex-col'>
    <div className='relaxed'>
      <h2 className='text-2xl'>
        <strong>{
          taskName
        }</strong>
      </h2>
      <p className='opacity-70'>Conversation history</p>
    </div>
    <Card className='flex-1 overflow-y-auto p-4'>
      <div className='space-y-4'>
        {messages.map((message) => {
          const isUser = isUserMessage(message)

          return <div
            key={message.id}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                isUser ? 'bg-sky-500 text-white' : 'bg-white/80'
              }`}
            >
              <p className='whitespace-pre-wrap'>{message.content}</p>
            </div>
          </div>
        })}
      </div>
    </Card>
    <div className='pt-4'>
      <Textarea
        label='Message'
        placeholder='Message sending is coming soon...'
        minRows={3}
        isDisabled
      />
    </div>
  </div>
}
