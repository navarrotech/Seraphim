// Copyright © 2026 Jalapeno Labs

// Core
import { useParams } from 'react-router-dom'

type WorkspaceRouteParams = {
  workspaceId?: string
}

export function ViewWorkspace() {
  const { workspaceId } = useParams<WorkspaceRouteParams>()

  if (!workspaceId) {
    console.debug('ViewWorkspace missing workspaceId in route params', { workspaceId })
  }

  return <section className='p-6'>
    <h2 className='relaxed'>Workspace</h2>
    <p className='opacity-80'>Placeholder page for workspace: {workspaceId || 'unknown'}</p>
  </section>
}
