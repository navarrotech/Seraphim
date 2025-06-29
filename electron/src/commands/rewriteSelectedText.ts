// Copyright © 2025 Jalapeno Labs

// Core
import { executeAgent } from '../langgraph/executeAgent'

// Tools
import { getUserTextSelection } from '../langgraph/tools/getUserTextSelection'
import { findAndReplaceTextInFile } from '../langgraph/tools/findAndReplaceTextInFile'
import { getProjectContext } from '../langgraph/tools/getProjectContext'
import { readTsFile } from '../langgraph/tools/readTsFile'
import { readFileTool } from '../langgraph/tools/readFile'

// Utility
import { ensureActiveWorkspace } from '../langgraph/utility/ensureActiveWorkspace'

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

export async function rewriteSelectedText() {
  await executeAgent(
    [
      {
        role: 'system',
        content: SystemPrompt
      },
      {
        role: 'user',
        content: 'Rewrite & refactor my active text selection in VSCode.'
      }
    ],
    [ getUserTextSelection, findAndReplaceTextInFile, readFileTool, getProjectContext, readTsFile ],
    {
      languageInstructions: {
        typescript: DeveloperPromptTypescript
      },
      shouldProceed: (snapshot) => {
        const inactiveWorkspaceError = ensureActiveWorkspace(snapshot)
        if (inactiveWorkspaceError) {
          return [ false, inactiveWorkspaceError ]
        }

        return [ true, '' ]
      }
    }
  )
}
