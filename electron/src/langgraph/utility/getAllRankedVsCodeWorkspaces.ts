// Copyright © 2026 Jalapeno Labs

import type { RootState } from '../../lib/redux-store'
import { getState } from '../../lib/redux-store'

export function getAllRankedVsCodeWorkspaces(
  includeUnfocused: boolean,
  state: RootState = getState(),
): string[] {
  const allVscodeStates = []
  if (includeUnfocused) {
    allVscodeStates.push(
      ...Object.values(state.data.vsCodeConnectionsByWorkspace),
    )
  }

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
