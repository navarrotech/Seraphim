// Copyright © 2025 Jalapeno Labs

import type { ActionContext } from '../types'
import type { ChatCompletionMessageParam } from 'openai/resources'

// Core
import { openai } from '@/utils/openai'
import { OPENAI_LOW_MODEL } from '@/constants'

// Lib
import fs from 'fs/promises'
import { Timer } from '@/utils/timer'
import { removeBackticks } from '@/utils/stripBackticks'
import { getLanguage } from '@/utils/getLanguage'

const SystemPrompt = `
You will be given a snippet of code, and your task is to generate documentation for the given function.
Be through in your documentation, and ensure that you follow the formatting guidelines provided below.

You should return the entire function, with documentation added in the appropriate format.
Return the entire function or method, with the new docs written.
Do not modify the inner function at all.

When providing examples, only include one example.

If an existing docstring is present, you should replace it with the new documentation.
`.trim()

const DeveloperPromptPython = `
# Formatting Python:
Use the Google style docstring format.
Example:
\`\`\`python
def my_function(param1: int, param2: str = "default") -> bool:
    """
    ### my_function:
    <summary>

    Example:
    <example description>
    <example code in backticks>

    Args:
        param1 (int): <description>
        param2 (str, optional): <description>. Defaults to <thing>.
    """
\`\`\`
`.trim()

const DeveloperPromptTypescript = `
Use the JSDoc format. Ensure you type the parameters and return values correctly.

Example:
\`\`\`typescript
/**
 * myFunction - A description of the function
 * This description can be multiline, if needed.
 *
 * @example
 * // returns true
 * myFunction(42, "example");
 * @param {number} param1 - The first parameter, which is a number.
 * @param {string} [param2="default"] - The second parameter, which is a string. Defaults to "default".
 * @throws {Error} Throws an error if something goes wrong.
 * @return {boolean} Returns true if successful, false otherwise.
 */
function myFunction(param1: number, param2: string = "default"): boolean {
    return true;
}
\`\`\`
`.trim()

export async function writeJsDoc(context: ActionContext): Promise<void> {
  const selection = context.vscodeWorkspace.selectedText[0]
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

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SystemPrompt
    }
  ]

  if (language === 'python') {
    messages.push({
      role: 'developer',
      content: DeveloperPromptPython
    })
  }
  if (language === 'typescript') {
    messages.push({
      role: 'developer',
      content: DeveloperPromptTypescript
    })
  }

  messages.push({
    role: 'user',
    content: selection
  })

  const jsDocTimer = new Timer('JsDoc')
  const response = await openai.chat.completions.create({
    model: OPENAI_LOW_MODEL,
    messages
  })
  jsDocTimer.stop()

  const content = removeBackticks(
    response.choices[0].message.content
  )
  console.debug(`[JSDOC]: Generated JSDoc content:\n${content}`)

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
