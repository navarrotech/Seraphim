// Copyright © 2026 Jalapeno Labs

// Core
import { useParams } from 'react-router-dom'

type WorkspaceTaskRouteParams = {
  workspaceId?: string
  taskId?: string
}

export function ViewWorkspaceTask() {
  const { workspaceId, taskId } = useParams<WorkspaceTaskRouteParams>()

  if (!workspaceId || !taskId) {
    console.debug('ViewWorkspaceTask missing route params', { workspaceId, taskId })
  }

  return <section className='p-6'>
    <h2 className='relaxed'>Workspace Task</h2>
    <p className='opacity-80'>Placeholder task {taskId || 'unknown'} in workspace {workspaceId || 'unknown'}.</p>
  </section>
}
