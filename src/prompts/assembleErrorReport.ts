// Copyright © 2025 Jalapeno Labs

import type { ActionContext, LineReference, RecommendedFix } from '@/types'
import type { ChatCompletionMessageParam } from 'openai/resources'

import chalk from 'chalk'
import { openai } from '@/utils/openai'

// Utility
import { gatherImportLines } from '@/utils/analyzeImportLines'
import { getPromptJson } from '@/utils/getPromptJson'
import { yup } from '@/utils/validators'

// Misc
import { OPENAI_MED_MODEL, MAX_IMPORT_LINES_TO_USE } from '@/constants'

const MaxIterations = 3

const JsonResponseSchema = yup.object({
  action: yup
    .string()
    .oneOf([ 'request-more-info', 'submit' ])
    .required(),
  lines: yup
    .array(
      yup.object({
        sourceFilePath: yup
          .string()
          .required(),
        importLine: yup
          .string()
          .required()
      })
    )
    .optional(),
  solution: yup
    .array(
      yup.object({
        absolutePath: yup
          .string()
          .required(),
        fix: yup
          .string()
          .required()
      })
    )
    .optional()
})

type SubmitResponse = {
  action: 'submit'
  solution: RecommendedFix[]
}

type RequestMoreInfoResponse = {
  action: 'request-more-info'
  lines: LineReference[]
}

type JsonResponse = SubmitResponse | RequestMoreInfoResponse

export async function assembleErrorReport(action: ActionContext): Promise<RecommendedFix[] | null> {
  console.debug('[PROMPTS]: Gathering initial error plan...')

  const frontendErrorLogs = action.chromeLogs
    .filter((log) => log.type === 'error')
    .map((log) => log.message).join('\n')

  let dockerErrorLogs = ''
  if (action.dockerLogsByContainer) {
    for (const [ container, logs ] of Object.entries(action.dockerLogsByContainer)) {
      if (!logs.length) {
        continue
      }
      dockerErrorLogs += `\n\nDocker stderr logs for ${container}:\n\`\`\`\n${logs.join('\n')}\n\`\`\``
    }
  }

  const sourceCodeFiles: ChatCompletionMessageParam[] = []
  if (action.sourceFiles) {
    for (const [ filePath, content ] of Object.entries(action.sourceFiles)) {
      // TODO: Future task, what if the source code file is too many tokens? Chunk it or shrink it?
      sourceCodeFiles.push({
        role: 'user',
        content: `${filePath}:\n\`\`\`\n${content}\n\`\`\``
      })
    }
  }

  const conversationHistory: ChatCompletionMessageParam[] = []

  async function recurse(iterations: number): Promise<RecommendedFix[] | null> {
    if (iterations > MaxIterations) {
      console.error(`${chalk.redBright('HALTING')}`)
      console.error('[PROMPTS]:  Failed to generate error report after multiple attempts.')
      return null
    }

    const isLastIteration = iterations === MaxIterations

    // For the purposes of caching, the system prompt should not change on each run.
    const initialErrorPlan = await openai.chat.completions.create({
      model: OPENAI_MED_MODEL,
      messages: [
        { role: 'system', content: SystemPrompt },
        {
          role: 'developer',
          content: isLastIteration
            ? DeveloperPromptFinalIteration
            : DeveloperPrompt
        },
        {
          role: 'user',
          content: (`
Frontend console errors:
\`\`\`
${frontendErrorLogs}
\`\`\`
${dockerErrorLogs}

Source file paths:
\`\`\`
${action.sourceFilePaths.join('\n')}
\`\`\`
            `).trim()
        },
        ...sourceCodeFiles,
        ...conversationHistory
      ],
      response_format: {
        type: 'json_object'
      }
    })

    const text = initialErrorPlan.choices[0].message.content
    const parsedResponse = getPromptJson<JsonResponse>(text, JsonResponseSchema)

    if (!parsedResponse) {
      console.log('[PROMPT]: Response failed to parse')
      console.debug(text)
      return await recurse(iterations + 1)
    }

    conversationHistory.push({
      role: 'assistant',
      content: text
    })

    // If we need more information, we should collect it
    if (parsedResponse.action === 'request-more-info') {
      console.debug(
        '[PROMPTS]: The LLM has requested more information about the following imports:\n',
        parsedResponse.lines.join('\n')
      )
      conversationHistory.push({
        role: 'user',
        content: await gatherImportLines(parsedResponse.lines)
      })
      return await recurse(iterations + 1)
    }

    console.debug('[PROMPTS]: The LLM has submitted a completed error report.')

    return parsedResponse.solution
  }

  return await recurse(0)
}


const SystemPrompt = `
You are an error fixing senior software developer.
• You will be given frontend console errors, backend stderr logs, and relevant source files
• Your job is to solve the error(s)
`.trim()


const SubmitFinalFixInstructions = `
Your solution must use conflict markers to indicate where the changes are made.
\`\`\`json
{
  "action": "submit",
  "solution": [
    {
      "absolutePath": "/full/path/to/source-file.ts",
      "fix": "
function myFunction() {
  // Some code here
<<<<<<< HEAD
  // This is the original code that needs to be fixed
======= 
>>>>>>> Suggested fix
}
      "
    }
  ]
}
\`\`\`
`.trim()

const DeveloperPrompt = `
If there are multiple unrelated errors, only focus on the first error and drop the secondary error.

When you respond, choose one of two JSON options:

1. Request more info about up to ${MAX_IMPORT_LINES_TO_USE} import lines.
Only import what you want more information about, no need to copy the line exactly.
You cannot request lines from npm packages. Only relative imports or absolute imports that start with '@' may be used.
\`\`\`json
{
  "action": "request-more-info",
  "lines": [
    {
      "sourceFilePath": "/full/path/to/source-file.ts",
      "importLine": "import { SomeFunction } from './some-module';"
    }
  ]
}
\`\`\`

2. Submit the final fix.
${SubmitFinalFixInstructions}

Return _only_ the JSON object (no extra text).
`.trim()

const DeveloperPromptFinalIteration = `
If there are multiple unrelated errors, only focus on the first error and drop the secondary error.

Previous responses have been allowed to request more information about import lines.
Now, you must submit the final fix. You cannot request any more information.

When you respond, you must submit the final fix in the following format:
${SubmitFinalFixInstructions}

Return _only_ the JSON object (no extra text).
`.trim()
