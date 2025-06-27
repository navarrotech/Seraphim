// Copyright © 2025 Jalapeno Labs

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import chalk from 'chalk'
import { openai } from '@/utils/openai'
import { OPENAI_HIGH_MODEL } from '@/constants'
import { readFile, writeFile } from 'fs/promises'
import { runVitest } from '@/utils/vitest'

// You will be given a Vitest test failure output and it's test file source code.
// Your task is to fix the failing tests in the file.
// Maintain as much of the original code as possible.
// This includes not stripping comments, or changing the code formatting.
// Only fix the tests so they pass; do not change the test logic.
// You must return the full file content, do not wrap your response in backtick fences.
// Your response will be directly written to the test file, and then ran with Vitest for a result.
const SystemPrompt = `
You are a principal web software developer, tasked with fixing a failing unit test.
You will be given the source function being tested, the test file, and the console error output.
The issue could be in either the test file or the source code file.
If there is a bug in the source code, do NOT write unit tests to compensate for the bug.
It's critical that the unit tests are written to verify the function's expected behavior, not to compensate for bugs.
Write your unit tests to ensure the correct, expected behavior of the function, even if the test will fail.
Prioritize optimization, readability, and maintainability.
Avoid large oneline statements, and written cleanly.
Comment your code as needed, but do not over-comment the oblivious.
Always well type your variables and functions.
`.trim()

const DeveloperPrompt = `
Do not wrap your response in backtick fences, your response will be directly written to the test file.
Do not strip comments or change the code formatting.
You can respond with two options:
1. If the issue is in the unit test file, fix the test code and return the full file content.
Prepend your response with the word "UNIT_TEST" at the start of your response.
2. If the issue is in the source code file, fix the source code and return the full file content.
Prepend your response with the word "SOURCE_CODE" at the start of your response.
When returning the source code, you must return the source function with conflict barriers of what you have changed.
`.trim()

export async function fixVitestTestErrors(
  testFile: string,
  sourceFilePath: string,
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
  console.log(output)

  const entireSourceCode = await readFile(sourceFilePath, 'utf-8')
  const unitTestFileContents = await readFile(testFile, 'utf-8')
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SystemPrompt
    },
    {
      role: 'developer',
      content: DeveloperPrompt
    },
    {
      role: 'user',
      content: unitTestFileContents
    },
    {
      role: 'user',
      content: entireSourceCode
    },
    {
      role: 'user',
      content: output
    }
  ]

  const result = await openai.chat.completions.create({
    model: OPENAI_HIGH_MODEL,
    messages,
    response_format: {
      type: 'text'
    }
  })

  const text = result.choices[0].message.content.trim()
  const tmp = text.split('\n')[0].trim().toLowerCase()

  if (tmp.startsWith('unit_test')) {
    const content = text.slice('unit_test'.length).trim()
    await writeFile(testFile, content)
    return false
  }
  else if (tmp.startsWith('source_code')) {
    const content = text.slice('source_code'.length).trim()
    await writeFile(sourceFilePath, content)
    return false
  }

  // If we got here, something is wrong with the response format?
  console.error(
    '[FIX VITEST TEST ERRORS]: Invalid response format from OpenAI, expected "unit_test" or "source_code" prefix.'
  )
  console.log('GOT:', tmp)

  return false
}
