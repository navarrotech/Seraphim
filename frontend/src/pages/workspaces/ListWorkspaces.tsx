// Copyright © 2026 Jalapeno Labs

// Lib
import useSWR from 'swr'

// User interface
import { Button, Card } from '@heroui/react'

// Misc
import { listWorkspaces } from '@frontend/lib/routes/workspaceRoutes'

export function ListWorkspaces() {
  const { data, error, isLoading, mutate } = useSWR(
    'workspaces',
    listWorkspaces,
  )
  const workspaces = data?.workspaces

  function handleRefresh() {
    void mutate()
  }

  let content = null

  if (isLoading) {
    content = <p className='opacity-80'>Loading workspaces...</p>
  }
  else if (error) {
      content = <Card className='p-4'>
        <p className='relaxed'>Unable to load workspaces.</p>
        <Button onPress={handleRefresh}>Try again</Button>
      </Card>
    }
  else if (!workspaces || workspaces.length === 0) {
      content = <Card className='p-4'>
        <p className='opacity-80'>No workspaces yet. Create your first one.</p>
      </Card>
    }
  else {
    content = <div className='relaxed'>
      {workspaces.map(function renderWorkspace(workspace) {
        return <Card key={workspace.id} className='relaxed p-4'>
          <div className='level'>
            <div>
              <div className='relaxed'>{
                workspace.name || 'Untitled workspace'
              }</div>
              <div className='opacity-80'>ID: {workspace.id}</div>
            </div>
            <Button>Open</Button>
          </div>
        </Card>
      })}
    </div>
  }

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='relaxed'>Workspaces</h2>
        <p className='opacity-80'>Manage all workspaces here.</p>
      </div>
      <Button>Create Workspace</Button>
    </div>
    {content}
  </section>
}
