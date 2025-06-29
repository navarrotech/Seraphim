// Copyright © 2025 Jalapeno Labs

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import { openai } from '@/utils/openai'
import { OPENAI_MED_MODEL } from '@/constants'
import { readFile, writeFile } from 'fs/promises'
import { runTsc } from '@/utils/tsc'

const SystemPrompt = `
You will be given a Typescript file and some tsc errors.
Your task is to fix the type errors in the file.
Maintain as much of the original code as possible.
This includes not stripping comments, or changing the code formatting.
Only fix the type errors, do not change the logic of the code.
You must return the full file content, do not wrap your response in backtick fences.
Your response will be directly written to the output file, and then ran + tested for a result.
`.trim()

export async function fixTypescriptErrors(
  targetFile: string
): Promise<boolean> {
  const [ filteredOutput, , fullOutput ] = await runTsc(targetFile)

  // Don't use exit code, it could be misleading.
  // For example, it may give a 1 but it may not be because it's related to this error!
  if (!filteredOutput.trim()) {
    return true
  }

  const tscErrorOutput = filteredOutput.trim() || fullOutput
  console.log('[FIX TYPESCRIPT ERRORS]: Received tsc errors, attempting to fix...')
  console.log(tscErrorOutput)

  const fileContent = await readFile(targetFile, 'utf-8')
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SystemPrompt
    },
    {
      role: 'user',
      content: tscErrorOutput
    },
    {
      role: 'user',
      content: fileContent
    }
  ]

  const result = await openai.chat.completions.create({
    model: OPENAI_MED_MODEL,
    messages,
    response_format: {
      type: 'text'
    }
  })

  const text = result.choices[0].message.content.trim()

  await writeFile(targetFile, text)

  return false
}
