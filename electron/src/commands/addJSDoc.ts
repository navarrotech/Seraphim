// Copyright © 2025 Jalapeno Labs

// Core
import { executeGraph } from '../langgraph/executeGraph'

// Tools
import { getUserTextSelection } from '../langgraph/tools/getUserTextSelection'

export async function addJSDoc() {
  await executeGraph(
    [
      {
        role: 'user',
        content: 'Take the user\'s text selection in VSCode and generate a JSDoc comment for it.'
      }
    ],
    [ getUserTextSelection ],
    (snapshot) => {
      const hasSelection = !!snapshot.state.data.activeVsCodeState?.userTextSelection?.length

      if (!hasSelection) {
        return [ false, 'Cannot run JSDoc command without an active VSCode text selection.' ]
      }

      const selection = snapshot.state.data.activeVsCodeState.userTextSelection.join(' ').trim()

      // TODO: Support classes and function methods in the future?
      if (!selection.includes('function')) {
        return [ false, 'Cannot run JSDoc command on a selection that does not include a function.' ]
      }

      return [ true, '' ]
    }
  )
}
