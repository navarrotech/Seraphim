// Copyright © 2026 Jalapeno Labs

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

const UserPrompt = `
I need help understanding the text that I have selected in VSCode.
Explain each of the lines that may be confusing or new to me.
Put the explanations in a comment above the line that it explains what it does.
In order me to see them, please replace my selection with the explanation.
Please don't modify my source code in any way, just replace the selection with the explanation.
`.trim()

export async function explainMyTextSelection() {
  await executeAgent(
    [
      {
        role: 'user',
        content: UserPrompt,
      },
    ],
    [ getUserTextSelection, findAndReplaceTextInFile, readFileTool, getProjectContext, readTsFile ],
    {
      shouldProceed: (snapshot) => {
        const inactiveWorkspaceError = ensureActiveWorkspace(snapshot)
        if (inactiveWorkspaceError) {
          return [ false, inactiveWorkspaceError ]
        }

        return [ true, '' ]
      },
    },
  )
}
