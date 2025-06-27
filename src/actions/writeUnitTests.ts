// Copyright © 2025 Jalapeno Labs

import type { ActionContext } from '@/types'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Lib
import chalk from 'chalk'
import { openai } from '@/utils/openai'
import { OPENAI_HIGH_MODEL } from '@/constants'
import path from 'path'
import fs from 'fs/promises'
import { Timer } from '@/utils/timer'
import { runVitest, getBestVitestPath } from '@/utils/vitest'
import { extractFunction } from '@/utils/extractFunction'
import { getFunctionName } from '@/utils/regex'
import { getLanguage, isJavascriptish, isReact } from '@/utils/getLanguage'

const SystemPrompt = `
You are now an experienced principal software developer and quality assurance expert.
You will be given a function, and your task is to write unit tests for it.
Your job is to be thorough, write unit tests to cover all edge cases, and ensure the function behaves as expected.
If there is a bug in the source code, do NOT write unit tests to compensate for the bug.
Write your unit tests to ensure the correct, expected behavior of the function, even if the test will fail.
Prioritize optimization, readability, and maintainability.
Avoid large oneline statements, and written cleanly.
Comment your code as needed, but do not over-comment the oblivious.
Always well type your variables and functions.

You will be given the following in a JSON format from the user:
- The output path for the unit test file
- The input path for the source code file + function name
- The source code of the function to test

It will be up to you to determine the relative import path and import method in your unit test file.

Return only the full unit test file. Do not format your solution with backtick fences.
Your response will be directly written to the output file, and then ran + tested for a result.
`.trim()

const TypescriptDeveloperPrompt = `
Write your unit tests for vitest.
Your it() functions should be written with "should" wording.
Utilize context for proper context passing and avoiding repetition.

Below is an example function with the user's preferred code formatting:
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

Below is considered good practice for vitest unit tests.
\`\`\`typescript
// Typescript
import type { Mock } from 'vitest'

// Core
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Context = {
  something: string
  mockResponse: string
  mockFn: Mock
}

beforeEach<Context>(async (context) => {
  // Do mocks here before importing the lib to test...
  const { something } = await import('./something')

  context.something = something()
  context.mockResponse = 'bar'

  const mockedThing = vi.fn(() => context.mockResponse)
  vi.doMock('thing', () => ({
    thing: mockedThing
  }))

  context.mockFn = mockedThing
})

describe('something', () => {
  it<Context>('should use context to access foo', (context) => {
    expect(context.something).toBe('foo')
  })
  it<Context>('should use context to set the mocked response', (context) => {
    context.mockResponse = 'bazz'

    // Run code...
    const result = something()

    expect(context.mockFn).toHaveBeenCalledTimes(1)
    expect(context.mockFn).toHaveBeenCalledWith(context.mockResponse)
  })
})
\`\`\`
`.trim()

const ReactDeveloperPrompt = `
You will need to include the react testing library for your unit tests.
You can import it at the top with the following import statement, at the top of the "core" import group:
import '@testing-library/jest-dom/vitest'
`.trim()

const PythonDeveloperPrompt = `
You will be writing unit tests for a python function, and they will be written in pytest.
# Mocking
Avoid monkey patching as much as possible.
If you must use a mock, instead create a mock object and override the import like so:
\`\`\`python
import some.thing as Thing

class MockThing:
    def get(self):
        return 'mocked response'

def get_thing_to_test():
  Thing.someLibToMock = MockThing()
  return Thing.libraryToTest()

def test_something():
  lib = get_thing_to_test()
  assert lib.someMethod() == 'mocked response'
\`\`\`
`.trim()

export async function writeUnitTests(context: ActionContext) {
  const selection = context.vscodeWorkspace.selectedText[0]
  if (!selection) {
    console.error('No text selected for unit test writing generation.')
    return
  }

  const filePath = context.vscodeWorkspace.focusedFilePath
  if (!filePath) {
    console.error('No focused file path available for unit test writing generation.')
    return
  }

  const fullFile = await fs.readFile(filePath, 'utf-8')
  if (!fullFile) {
    console.error('Failed to read the file content for unit test writing generation.')
    return
  }

  const functionName = getFunctionName(selection)
  if (!functionName) {
    console.error('No function name found in the selected text for unit test writing generation.')
    return
  }

  // Ensure vitest is ready to run in the workspace
  const [ vitestCmd, vitestArgs, vitestCwd ] = await getBestVitestPath(filePath, context.vscodeWorkspace.absolutePath)
  if (!vitestCmd) {
    console.error('No suitable vitest executable found for running unit tests.')
    return
  }

  // TODO: what if the output already exists? Could we write to improve it?
  const outputPath = path.join(
    path.dirname(filePath),
    `${functionName}.test${path.extname(filePath)}`
  )

  const extractedFunction = await extractFunction(filePath, functionName)

  console.log('[WRITE UNIT TESTS]: Preparing to get initial round of unit tests back...')

  // Add the root system prompt
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SystemPrompt
    }
  ]

  // Add language-specific developer instructions
  const language = getLanguage(filePath)
  const isJs = isJavascriptish(filePath)
  const isPy = language === 'python'
  if (isJs) {
    messages.push({
      role: 'developer',
      content: TypescriptDeveloperPrompt
    })
    console.log('[WRITE UNIT TESTS]: Adding Typescript instructions for using Vitest...')

    if (isReact(filePath)) {
      messages.push({
        role: 'developer',
        content: ReactDeveloperPrompt
      })
      console.log('[WRITE UNIT TESTS]: Adding React Testing Library instructions...')
    }
  }
  else if (isPy) {
    messages.push({
      role: 'developer',
      content: PythonDeveloperPrompt
    })
    console.log('[WRITE UNIT TESTS]: Adding Python instructions for using Pytest...')
  }

  // Add the source code from the user
  messages.push({
    role: 'user',
    content: JSON.stringify({
      outputPath: outputPath,
      inputPath: filePath,
      functionName: functionName,
      sourceCode: extractedFunction
    })
  })

  console.log('[WRITE UNIT TESTS]: Sending the initial write unit test request to OpenAI...')
  const timer = new Timer('Write initial unit tests')
  const initialUnitTest = await openai.chat.completions.create({
    model: OPENAI_HIGH_MODEL,
    messages,
    response_format: {
      type: 'text'
    }
  })

  timer.stop()

  // At this point, we should have the initial unit test generated
  console.log('[WRITE UNIT TESTS]: Received initial unit test response, writing to file and testing...')

  const initialContent = initialUnitTest.choices[0].message.content.trim()

  await fs.writeFile(outputPath, initialContent, 'utf-8')

  const runTestsTimer = new Timer('Run unit tests')

  let result: string
  let exitCode: number
  if (isJs) {
    const [ output, vitestExitCode, fullCommand ] = await runVitest(
      outputPath,
      vitestCwd,
      vitestCmd,
      vitestArgs
    )

    console.log(`[WRITE UNIT TESTS]: Running vitest unit tester with command:
CWD: ${chalk.blue(vitestCwd)}
CMD: ${chalk.green(fullCommand)}
    `.trim())

    result = output
    exitCode = vitestExitCode
  }
  if (isPy) {
    // TODO: Implement Python unit test running
  }

  runTestsTimer.stop()

  if (!result) {
    console.error('No result returned from running the unit tests.')
    return
  }

  console.log(result)

  if (exitCode === 0) {
    console.log('[WRITE UNIT TESTS]: Unit tests passed successfully!')
  }

  console.log(`[WRITE UNIT TESTS]: Unit tests exited with code ${exitCode}.`)
}
