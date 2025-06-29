// Copyright © 2025 Jalapeno Labs

import type { BaseMessageLike } from '@langchain/core/messages'
import type { LanguageSpecificInstructions, ContextSnapshot } from '../types'

// Core
import { isPython, isJavascriptish, isReact } from '@common/getLanguage'

export function appendLanguageInstructions(
  messages: BaseMessageLike | BaseMessageLike[],
  context: Readonly<ContextSnapshot>,
  instructions?: LanguageSpecificInstructions
): BaseMessageLike[] {
  // If there is a system prompt, add the language instructions to it AFTER the system prompt
  // Add them as developer prompts
  // If there is no system prompt, add them as the first message
  const raw: unknown[] = Array.isArray(messages)
    ? messages
    : [ messages ]

  // 2. normalize every element into BaseMessageLike
  const msgArray: BaseMessageLike[] = raw.map((m) => {
    // tuple form: [ role, content ]
    if (Array.isArray(m) && m.length >= 2 && typeof m[0] === 'string') {
      const [ role, content ] = m as [string, any]
      return { role, content } as BaseMessageLike
    }
    // already a BaseMessageLike
    return m as BaseMessageLike
  })

  // nothing to do if no messages or no instructions
  if (!msgArray.length || !instructions) {
    return msgArray
  }

  let isFilePython = true
  let isFileTypescript = true
  let isFileReact = true

  const targetFile = context.state.data.activeVsCodeState?.focusedFilePath
  if (targetFile) {
    isFilePython = isPython(targetFile)
    isFileTypescript = isJavascriptish(targetFile)
    isFileReact = isReact(targetFile)
  }

  // build your developer‐instruction messages
  const devInstructions: BaseMessageLike[] = []
  if (instructions.python && isFilePython) {
    devInstructions.push({ role: 'developer', content: instructions.python.trim() })
  }
  if (instructions.typescript && isFileTypescript) {
    devInstructions.push({ role: 'developer', content: instructions.typescript.trim() })
  }
  if (instructions.react && isFileReact) {
    devInstructions.push({ role: 'developer', content: instructions.react.trim() })
  }
  if (!devInstructions.length) {
    return msgArray
  }

  // find any system prompt
  const systemIdx = msgArray.findIndex((m) => (m as any).role === 'system')

  // insert after the system prompt, or unshift at top
  const newMessages = [ ...msgArray ]
  if (systemIdx !== -1) {
    newMessages.splice(systemIdx + 1, 0, ...devInstructions)
  }
  else {
    newMessages.unshift(...devInstructions)
  }

  return newMessages
}
