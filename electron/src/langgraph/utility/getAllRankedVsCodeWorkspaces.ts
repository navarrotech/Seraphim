// Copyright © 2025 Jalapeno Labs

import { getState } from '../../lib/redux-store'

export function getAllRankedVsCodeWorkspaces(): string[] {
  const state = getState()

  const allVscodeStates = [
    // Temporarily commenting out, so it's not used
    // Edge case: the user is selecting something in a workspace without a config?
    // ...Object.values(state.data.vsCodeConnectionsByWorkspace)
  ]

  // Put the most active workspace at the top
  allVscodeStates.sort((a, b) => b.lastActiveTime - a.lastActiveTime)

  // Put the most likely active candidate at the very top of the array
  if (state.data.activeVsCodeState?.workspacePaths?.length) {
    allVscodeStates.unshift(state.data.activeVsCodeState)
  }

  const flattened = new Set<string>()
  for (const vsCodeState of allVscodeStates) {
    if (vsCodeState.workspacePaths?.length) {
      for (const workspacePath of vsCodeState.workspacePaths) {
        flattened.add(workspacePath.path)
      }
    }
  }

  return Array.from(flattened)
}
