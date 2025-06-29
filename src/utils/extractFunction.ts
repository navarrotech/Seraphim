// Copyright © 2025 Jalapeno Labs

import type { ChatCompletionMessageParam, ChatModel } from 'openai/resources'

import { openai } from './openai'
import { OPENAI_HIGH_MODEL } from '@/constants'
import fs from 'fs'
import path from 'path'
import { searchUpwardsForFile } from './searchUpwardsForFile'
import { Timer } from './timer'


const SystemPrompt = `
I need your help with filtering out irrellevant code from a raw source code file.
The user will give you the full raw source code of a file and a target function name.
Your job is to filter and extract a specific function from a given file.
Your task is to return only the relevant parts of the function, which another LLM prompt can use your response to:
- Debug the given function
- Rewrite the given function
- Write unit tests for the given function

You should keep:
- The imports/top-level consts/types/etc. that the function actually uses
- Import related comments
- The doc string comments (if any) attached to the function
- The function declaration itself, and comments within the function body
- Any globals or types defined in that source file, that the function uses

If there are any unclear imports, you should request more information about them as needed.
_After_ you have requested more information about them, your final response should include comments
that describe the unclear import's type definitions to make it clear their purpose & usage.
`.trim()

const DeveloperPrompt = `
Do not wrap any of your responses with backtick fences.
You may only request more details one time, do not request more details any additional times.

You can respond with one of two options:
1. If you have enough information to extract the function, submit your final report.
Prefix the word "FINAL" at the start of your response.

2. If you need more information, ask the user for clarification.
Prefix the word "REQUEST_DETAILS" at the start of your response.
You may only inquire up to 5 imports maximum.
Each line in the requested details must be an absolute path to the file you wish to view.
If the import is a relative path, you should request the resolved absolute path to the file.
If the import starts with a '@' it's likely an absolute import. You can refer to the tsconfig.json if it's available.
You cannot request details about third party library imports.

Example REQUEST_DETAILS response:
REQUEST_DETAILS
/absolute/path/to/file/importedFile.ts
/other/absolute/path/to/file/anotherImportedFile.ts
c:\\absolute\\path\\to\\file\\importedFile.ts
`.trim()

type Options = {
  model?: ChatModel,
  includeTsconfig?: boolean,
  includePackageJson?: boolean
}

const defaultOptions: Options = {
  model: OPENAI_HIGH_MODEL,
  includeTsconfig: true,
  includePackageJson: true
}

export async function extractFunction(
  filePath: string,
  functionName: string,
  options: Options = {}
): Promise<string> {
  options = Object.assign({}, defaultOptions, options)

  const fullTimer = new Timer('Extract function')
  console.log(
    `[EXTRACT FUNCTION]: Extracting function "${functionName}" from file: ${filePath}...`
  )

  const fullFileContents = fs.readFileSync(filePath)

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SystemPrompt
    },
    {
      role: 'developer',
      content: DeveloperPrompt
    }
  ]

  if (options.includeTsconfig) {
    const tsconfigPath = await searchUpwardsForFile(
      path.dirname(filePath),
      'tsconfig.json',
      true
    )

    if (tsconfigPath) {
      const tsconfigContent = fs.readFileSync(tsconfigPath)
      messages.push({
        role: 'developer',
        content: `The user's tsconfig.json at (${tsconfigPath}):\n\`\`\`json\n${tsconfigContent}\n\`\`\``
      })
    }
  }

  if (options.includePackageJson) {
    const packageJsonPath = await searchUpwardsForFile(
      path.dirname(filePath),
      'package.json'
    )

    if (packageJsonPath) {
      const packageJsonContent = fs.readFileSync(packageJsonPath)
      messages.push({
        role: 'developer',
        content: `The user's package.json at (${packageJsonPath}):\n\`\`\`json\n${packageJsonContent}\n\`\`\``
      })
    }
  }

  const userContent = `
Filepath: ${filePath}
Target function: ${functionName}
Source code:
${fullFileContents}
  `.trim()

  // TODO: Handle huge files bigger than 4000+ tokens

  messages.push({
    role: 'user',
    content: userContent
  })

  const response = await openai.chat.completions.create({
    messages,
    model: options.model,
    response_format: {
      type: 'text'
    }
  })

  const text = response.choices[0].message.content.trim()

  // Great, no follow up is needed! Continue with the final response...
  if (text.toLowerCase().startsWith('final')) {
    console.log(
      `[EXTRACT FUNCTION]: The assistant has provided the final response (on the first round) for "${functionName}".`
    )
    fullTimer.stop()
    return text.slice(5).trim()
  }

  if (!text.toLowerCase().startsWith('request_details')) {
    // Edge case scenario if we get here, we should log it
    console.warn(
      '[EXTRACT FUNCTION]: The assistant sent a response that didn\'t start with "FINAL" or "REQUEST_DETAILS".'
    )
    fullTimer.stop()
    return text.trim()
  }

  const additionalDetailsTimer = new Timer('Extract additional details')

  // If we got here, then the assistant has requested more details about some imports.
  const requestedDetails = text.replace(/^request_details/i, '').trim()

  console.log(
    `[EXTRACT FUNCTION]: The assistant is requesting more details about the following imports:\n${requestedDetails}`
  )

  const additionalDetails: string[] = []
  for (const line of requestedDetails.split('\n')) {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      continue
    } // Skip empty lines

    // Resolve the absolute path to the file
    let absolutePath: string
    if (path.isAbsolute(trimmedLine)) {
      absolutePath = trimmedLine
    }
    else {
      absolutePath = path.resolve(path.dirname(filePath), trimmedLine)
    }

    // Handle node or python modules...
    if (
      absolutePath.includes('node_modules')
      || absolutePath.includes('vendor')
      || absolutePath.includes('site-packages')
    ) {
      console.warn(
        `[EXTRACT FUNCTION]: The assistant requested details about a third-party library import: ${absolutePath}...`
      )
      additionalDetails.push(`You requested this path ${absolutePath}, but it's a third-party library import.`)
      continue
    }

    // Read the file content and append it to the messages
    try {
      const fileContent = fs.readFileSync(absolutePath, 'utf-8')
      messages.push({
        role: 'user',
        content: `Requested file content at ${absolutePath} is:\n${fileContent}`
      })
    }
    catch (error) {
      console.error(`Failed to read requested file at ${absolutePath}:`, error)
      additionalDetails.push(
        `No file exists at the requested path: ${absolutePath}.`
      )
    }
  }

  if (additionalDetails.length > 0) {
    messages.push({
      role: 'user',
      content: `
The following imports you have requested details about, have failed:
${additionalDetails.join('\n')}
You may not request any more additional details, please do not attempt to guess the types of these failed imports.
      `.trim()
    })
  }

  const finalResponse = await openai.chat.completions.create({
    messages,
    model: options.model,
    response_format: {
      type: 'text'
    }
  })

  const finalText = finalResponse.choices[0].message.content.trim()

  additionalDetailsTimer.stop()
  fullTimer.stop()

  if (finalText.toLowerCase().startsWith('final')) {
    return finalText.slice(5).trim()
  }

  // Edge case scenario if we get here, we should log it
  console.warn(
    '[EXTRACT FUNCTION]: The assistant sent a response that didn\'t start with "FINAL" or "REQUEST_DETAILS".'
  )

  return finalText
}
