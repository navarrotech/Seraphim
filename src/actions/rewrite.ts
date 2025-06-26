// Copyright © 2025 Jalapeno Labs

import type { ActionContext } from '../types'
import type { ChatCompletionMessageParam } from 'openai/resources'

// Core
import { openai } from '@/utils/openai'
import { OPENAI_HIGH_MODEL } from '@/constants'

// Lib
import path from 'path'
import fs from 'fs/promises'
import { Timer } from '@/utils/timer'
import { removeBackticks } from '@/utils/stripBackticks'
import { extractFunction } from '@/utils/extractFunction'
import { getLanguage } from '@/utils/getLanguage'

const SystemPrompt = `
You are now an experienced principal software developer.
You will be given a snippet of code, and your task is to re-write the main function.
Prioritize optimization, readability, and maintainability.
Avoid large oneline statements, and written cleanly.
Comment your code as needed, but do not over-comment the oblivious.
If rewriting a function, you must keep the same function name, async status, and parameters.
If a function or method docstring is present, you should aim to maintain the original and not change it.
If there is no docstring, do not add one.
If you need to add imports, add them at the top of the file. Otherwise, only return the re-written code snippet.
`.trim()

const DeveloperPromptTypescript = `
- Return statements should be on their own line, do not inline them.
- Never use var, 'any', or semi colons.
- If the function is typescript, always well type your variables and functions.
Example function with preferred formatting:
\`\`\`typescript
type Animal = {
  canFly: boolean
  hasFeathers: boolean
  sound: string
}

function isChicken(
  animal: Animal
): boolean {
  // It cannot be a chicken if it does not have feathers
  if (!animal.hasFeathers) {
    return false
  }

  // Chickens cannot fly
  if (animal.canFly) {
    return false
  }

  // Check if the animal can fly
  const doesCluck = animal.sound === 'cluck'
  if (!doesCluck) {
    return false
  }

  // It must be a chicken!
  return true
}
\`\`\`
`.trim()

const functionRegex = /\bfunction\s+([A-Za-z$_][A-Za-z0-9$_]*)(?=\s*(?:<[^>]*>)?\s*\()/

export async function rewriteSelection(context: ActionContext): Promise<void> {
  let selection = context.vscodeWorkspace.selectedText[0]
  if (!selection) {
    console.error('No text selected for JSDoc generation.')
    return
  }

  const filePath = context.vscodeWorkspace.focusedFilePath
  if (!filePath) {
    console.error('No focused file path available for JSDoc generation.')
    return
  }

  const originalContent = await fs.readFile(filePath, 'utf-8')
  if (!originalContent) {
    console.error('Failed to read the file content for JSDoc generation.')
    return
  }

  const language = getLanguage(filePath)
  const filename = path.basename(filePath)

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SystemPrompt
    }
  ]

  if (language === 'typescript') {
    messages.push({
      role: 'developer',
      content: DeveloperPromptTypescript
    })
  }

  const hasFunction = selection.includes('function')
  if (hasFunction) {
    const functionName = functionRegex.exec(selection)[1]
    selection = extractFunction(selection, functionName)
  }

  messages.push({
    role: 'user',
    content: `
${filename}
\`\`\`
${selection}
\`\`\`
`.trim()
  })

  const rewriteTimer = new Timer('Rewrite')
  const response = await openai.chat.completions.create({
    model: OPENAI_HIGH_MODEL,
    messages
  })
  rewriteTimer.stop()

  const content = removeBackticks(
    response.choices[0].message.content
  )
  console.debug(`[REWRITE]: Rewrote content:\n${content}`)

  // Old method:
  // const applyTimer = new Timer('ApplyConflictBarriers')
  // await applyConflictBarriers({
  //   absolutePath: filePath,
  //   fix: content
  // })
  // applyTimer.stop()

  // New method:
  const updated = originalContent.replace(
    selection.trim(),
    content
  )
  await fs.writeFile(filePath, updated, 'utf-8')
  console.debug(`[JSDOC]: Updated file at ${filePath}`)
}
