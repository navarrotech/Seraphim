// Copyright © 2025 Jalapeno Labs

import type { RecommendedFix } from '@/types'

// Core
import { openai } from '@/utils/openai'

// Lib
import { removeBackticks } from '@/utils/stripBackticks'
import fs from 'fs/promises'

// Misc
import { OPENAI_LOW_MODEL } from '@/constants'

// System prompt for the OpenAI request
const SystemPrompt = `
You will be given a partial snippet of content that has the appropriate conflict barriers applied to it.
Your task is to re-apply the conflict barriers to the full file.
Return the full file with the conflict barriers applied.
Do not re-modify the content outside of the conflict barriers.
`.trim()

export async function applyConflictBarriers(
  { absolutePath, fix }: RecommendedFix
): Promise<boolean> {
  try {
    // Read the original file
    const fileContent = await fs.readFile(absolutePath, 'utf-8')

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: OPENAI_LOW_MODEL,
      messages: [
        {
          role: 'system',
          content: SystemPrompt
        },
        {
          role: 'user',
          content: `Conflict barriers for a partial content:\n\`\`\`\n${fix}\n\`\`\``
        },
        {
          role: 'user',
          content: fileContent
        }
      ]
    })

    const text = response.choices?.[0]?.message?.content
    if (!text) {
      console.error(`[PROMPTS]: No content returned from OpenAI for ${absolutePath}`)
      return false
    }

    // Extract the updated content
    const updatedContent = removeBackticks(text)

    // Write the updated content back to the file
    await fs.writeFile(absolutePath, updatedContent, 'utf-8')

    return true
  }
  catch (error) {
    console.error(`[PROMPTS]: Failed to apply conflict barriers for ${absolutePath}:`, error)
    return false
  }
}
