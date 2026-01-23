// Copyright © 2026 Jalapeno Labs

// Core
import { Link } from 'react-router-dom'

// User interface
import { Button, Card } from '@heroui/react'

// Utility
import { useSelector } from '@frontend/framework/store'

// Misc
import { UrlTree } from '@common/urls'

function getWorkspaceLink(workspaceId: string) {
  return UrlTree.workspaceView.replace(':workspaceId', workspaceId)
}

export function ListWorkspaces() {
  const workspaces = useSelector((state) => state.workspaces.items)

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='relaxed'>Workspaces</h2>
        <p className='opacity-80'>Manage all workspaces here.</p>
      </div>
      <Button as={Link} to={UrlTree.workspaceCreate}>Create Workspace</Button>
    </div>
    <div className='relaxed'>{
      workspaces.map((workspace) =>
        <Card key={workspace.id} className='relaxed p-4'>
          <div className='level'>
            <div>
              <div className='relaxed'>{
                workspace.name || 'Untitled workspace'
              }</div>
              <div className='opacity-80'>ID: {workspace.id}</div>
            </div>
            <Button
              as={Link}
              to={getWorkspaceLink(workspace.id)}
            >
              <span>Open</span>
            </Button>
          </div>
        </Card>,
      )
    }</div>
  </section>
}
