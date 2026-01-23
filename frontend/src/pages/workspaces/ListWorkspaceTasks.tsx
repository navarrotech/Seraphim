// Copyright © 2026 Jalapeno Labs

// Core
import { useParams } from 'react-router-dom'

type WorkspaceRouteParams = {
  workspaceId?: string
}

export function ListWorkspaceTasks() {
  const { workspaceId } = useParams<WorkspaceRouteParams>()

  if (!workspaceId) {
    console.debug('ListWorkspaceTasks missing workspaceId in route params', { workspaceId })
  }

  return <section className='p-6'>
    <h2 className='relaxed'>Workspace Tasks</h2>
    <p className='opacity-80'>Placeholder page for tasks in workspace: {workspaceId || 'unknown'}</p>
  </section>
}
