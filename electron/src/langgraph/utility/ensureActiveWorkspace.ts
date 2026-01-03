// Copyright © 2026 Jalapeno Labs

import type { ContextSnapshot } from '../types'

export function ensureActiveWorkspace(snapshot: Readonly<ContextSnapshot>): string | null {
  const hasSelection = !!snapshot.state.data.activeVsCodeState?.userTextSelection?.length
  const focusedFilePath = !!snapshot.state.data.activeVsCodeState?.focusedFilePath
  const firstWorkspace = !!snapshot.state.data.activeVsCodeState?.workspacePaths[0]

  if (!hasSelection) {
    return 'Cannot run command without an active VSCode text selection.'
  }

  if (!focusedFilePath) {
    return 'Cannot run command without an active VSCode editor file being focused.'
  }

  if (!firstWorkspace) {
    return 'Cannot run command without an active, open VSCode workspace.'
  }

  return null
}
