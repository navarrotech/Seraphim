// Copyright © 2025 Jalapeno Labs


// import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import chalk from 'chalk'
// import { openai } from '@/utils/openai'
// import { OPENAI_MED_MODEL } from '@/constants'
// import { readFile, writeFile } from 'fs/promises'
import { runVitest } from '@/utils/vitest'

// MAJOR TODO: This function also needs to support changing the source code!
// The goal is to write the unit tests to the expected input/output, NOT to write
// Unit tests to forcibly pass the tests and enforce bad logic.w

// const VitestSystemPrompt = `
// You will be given a Vitest test failure output and it's test file source code.
// Your task is to fix the failing tests in the file.
// Maintain as much of the original code as possible.
// This includes not stripping comments, or changing the code formatting.
// Only fix the tests so they pass; do not change the test logic.
// You must return the full file content, do not wrap your response in backtick fences.
// Your response will be directly written to the test file, and then ran with Vitest for a result.
// `.trim()


export async function fixVitestTestErrors(
  testFile: string,
  vitestCwd: string,
  vitestCmd: string,
  vitestArgs: string[]
): Promise<boolean> {
  const [ output, vitestExitCode, fullCommand ] = await runVitest(
    testFile,
    vitestCwd,
    vitestCmd,
    vitestArgs
  )

  console.log(`
[WRITE UNIT TESTS]: Ran vitest unit tester with command:
CWD: ${chalk.blue(vitestCwd)}
CMD: ${chalk.green(fullCommand)}
OUT: ${output}
  `.trim())

  if (vitestExitCode === 0) {
    console.log('[WRITE UNIT TESTS]: Vitest tests passed successfully!')
    return true
  }

  console.log('[FIX VITEST TEST ERRORS]: Received Vitest errors, attempting to fix...')
  throw new Error('--HALTING-- This feature not ready yet')
  // console.log(output)

  // const vitestErrorOutput = output.trim() || fullCommand
  // const fileContent = await readFile(testFile, 'utf-8')
  // const messages: ChatCompletionMessageParam[] = [
  //   {
  //     role: 'system',
  //     content: VitestSystemPrompt
  //   },
  //   {
  //     role: 'user',
  //     content: vitestErrorOutput
  //   },
  //   {
  //     role: 'user',
  //     content: fileContent
  //   }
  // ]

  // const result = await openai.chat.completions.create({
  //   model: OPENAI_MED_MODEL,
  //   messages,
  //   response_format: {
  //     type: 'text'
  //   }
  // })

  // const text = result.choices[0].message.content.trim()

  // await writeFile(testFile, text)

  // return false
}
