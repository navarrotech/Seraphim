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
Your task is to generate documentation.
Be thorough, and ensure that you follow the proper formatting guidelines.
If an existing docstring is present, you should replace it with the new documentation.
Replace the user's selection with the generated documentation.
Do not modify their source code in any way.
`.trim()

const DeveloperPromptPython = `
# Formatting Python:
Use the Google style docstring format.
When providing examples, only include one example.
Do not exceed 80 characters per line.

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
Use 'return' not 'returns'.
When providing examples, only include one example.
Do not exceed 100 characters per line.

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

export async function addJSDoc() {
  await executeAgent(
    [
      {
        role: 'system',
        content: SystemPrompt
      },
      {
        role: 'user',
        content: 'Generate JSDoc for my active text selection in VSCode.'
      }
    ],
    [ getUserTextSelection, findAndReplaceTextInFile, readFileTool, getProjectContext, readTsFile ],
    {
      languageInstructions: {
        python: DeveloperPromptPython,
        typescript: DeveloperPromptTypescript
      },
      shouldProceed: (snapshot) => {
        const inactiveWorkspaceError = ensureActiveWorkspace(snapshot)
        if (inactiveWorkspaceError) {
          return [ false, inactiveWorkspaceError ]
        }

        const selection = snapshot.state.data.activeVsCodeState.userTextSelection
          .map((line) => line.text.trim())
          .join(' ')
          .trim()

        // TODO: Support classes and function methods in the future?
        if (!selection.includes('function')) {
          return [ false, 'Cannot run JSDoc command on a selection that does not include a function.' ]
        }

        return [ true, '' ]
      }
    }
  )
}
