// Copyright © 2026 Jalapeno Labs

type Message = {
  content: string
}

export function conjoiner(messages: Message[]): string {
  if (!Array.isArray(messages)) {
    messages = [ messages ]
  }

  const content: string[] = []
  for (const message of messages) {
    if (message?.content) {
      content.push(message.content)
    }
  }
  return content.join(' ')
}
