// Copyright © 2026 Jalapeno Labs

// Core
import { Link } from 'react-router-dom'

// User interface
import { Button, Card, Tooltip } from '@heroui/react'

// Utility
import { dispatch, useSelector } from '@frontend/framework/store'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'

// Misc
import { getWorkspaceEditUrl, getWorkspaceViewUrl, UrlTree } from '@common/urls'
import { DeleteIcon, EditBulkIcon, OpenIcon } from '@frontend/common/IconNexus'
import { deleteWorkspace } from '@frontend/lib/routes/workspaceRoutes'

export function ListWorkspaces() {
  const workspaces = useSelector((state) => state.workspaces.items)

  async function handleDelete(workspaceId: string) {
    try {
      await deleteWorkspace(workspaceId)
      dispatch(
        workspaceActions.removeWorkspace(workspaceId),
      )
    }
    catch (error) {
      console.debug('ListWorkspaces failed to delete workspace', { error })
    }
  }

  if (!workspaces || workspaces.length === 0) {
    return <section className='container p-6'>
      <div className='relaxed'>
        <h2 className='relaxed text-2xl'>
          <strong>Workspaces</strong>
        </h2>
        <p className='opacity-80'>Manage all workspaces here.</p>
      </div>
      <Card className='relaxed p-6'>
        <div className='relaxed'>
          <div className='text-xl'>No workspaces yet.</div>
          <p className='opacity-80'>Create your first workspace to start orchestrating tasks.</p>
        </div>
        <Button as={Link} to={UrlTree.workspaceCreate}>
          <span>Create Workspace</span>
        </Button>
      </Card>
    </section>
  }

  return <section className='container p-6'>
    <div className='level relaxed'>
      <div>
        <h2 className='relaxed'>Workspaces</h2>
        <p className='opacity-80'>Manage all workspaces here.</p>
      </div>
      <Button
        as={Link}
        to={UrlTree.workspaceCreate}
        color='primary'
      >
        <span>Create Workspace</span>
      </Button>
    </div>
    <Card className='relaxed p-2'>
      <div className='grid grid-cols-12 gap-4 px-4 py-3 text-sm opacity-70'>
        <div className='col-span-6'>Workspace</div>
        <div className='col-span-6'>Description</div>
      </div>
      <div className='divide-y'>
        {workspaces.map((workspace) =>
          <div
            key={workspace.id}
            className='group relative grid grid-cols-12 gap-4 px-4 py-4 items-center'
          >
            <div className='col-span-6'>
              <Link
                to={getWorkspaceViewUrl(workspace.id)}
                className='block'
              >
                <div className='text-lg'>{workspace.name || 'Untitled workspace'}</div>
                <div className='opacity-60 text-sm'>{workspace.repository}</div>
              </Link>
            </div>
            <div className='col-span-6'>
              <div className='opacity-80 text-sm'>{
                workspace.description || 'No description added yet.'
              }</div>
            </div>
            <div className='absolute right-4 top-1/2 -translate-y-1/2'>
              <div className='flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100'>
                <Tooltip content='Open workspace'>
                  <Button
                    size='sm'
                    variant='light'
                    isIconOnly
                    as={Link}
                    to={getWorkspaceViewUrl(workspace.id)}
                  >
                    <span className='icon'>
                      <OpenIcon />
                    </span>
                  </Button>
                </Tooltip>
                <Tooltip content='Edit workspace'>
                  <Button
                    size='sm'
                    variant='light'
                    isIconOnly
                    as={Link}
                    to={getWorkspaceEditUrl(workspace.id)}
                  >
                    <span className='icon'>
                      <EditBulkIcon />
                    </span>
                  </Button>
                </Tooltip>
                <Tooltip content='Delete workspace'>
                  <Button
                    size='sm'
                    variant='light'
                    isIconOnly
                    onPress={() => handleDelete(workspace.id)}
                  >
                    <span className='icon'>
                      <DeleteIcon />
                    </span>
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>,
        )}
      </div>
    </Card>
  </section>
}
