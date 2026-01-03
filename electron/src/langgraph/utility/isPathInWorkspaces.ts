// Copyright © 2026 Jalapeno Labs

import type { ContextSnapshot } from '../types'

import { getAllRankedVsCodeWorkspaces } from './getAllRankedVsCodeWorkspaces'
import { isSubPath } from '../../../../common/src/node/isSubPath'

export function isPathInWorkspaces(filepath: string, context: ContextSnapshot): boolean {
  const workspaces = getAllRankedVsCodeWorkspaces(false, context.state)
  return workspaces.some((workspace) => isSubPath(workspace, filepath))
}
