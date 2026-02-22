// Copyright © 2026 Jalapeno Labs

// Core
import { Link } from 'react-router-dom'

// User interface
import { Button, Card, Tooltip } from '@heroui/react'

// Utility
import { dispatch, useSelector } from '@frontend/framework/store'
import { workspaceActions } from '@frontend/framework/redux/stores/workspaces'

// Misc
import {
  moment,
  STANDARD_TIME_FORMAT_FULL,
  STANDARD_TIME_FORMAT_SHORT,
} from '@common/time'
import { getWorkspaceEditUrl, UrlTree } from '@common/urls'
import { DeleteIcon, EditBulkIcon } from '@frontend/common/IconNexus'
import { deleteWorkspace } from '@frontend/lib/routes/workspaceRoutes'


function formatTimestamp(dateIso: string | Date) {
  const parsedDate = moment(dateIso)

  if (!parsedDate.isValid()) {
    console.debug('ListWorkspaces received invalid timestamp for formatting', {
      dateIso,
    })
    return {
      short: 'Unknown',
      full: 'Unknown timestamp',
    }
  }

  return {
    short: parsedDate.format(STANDARD_TIME_FORMAT_SHORT),
    full: parsedDate.format(STANDARD_TIME_FORMAT_FULL),
  }
}

export function ListWorkspaces() {
  const workspaces = useSelector((state) => state.workspaces.items)

  async function handleDelete(workspaceId: string) {
    try {
      await deleteWorkspace(workspaceId)
      dispatch(
        workspaceActions.removeWorkspace({ id: workspaceId }),
      )
    }
    catch (error) {
      console.debug('ListWorkspaces failed to delete workspace', { error })
    }
  }

  if (!workspaces || workspaces.length === 0) {
    return <section>
      <div className='relaxed'>
        <h2 className='text-2xl'>
          <strong>Workspaces</strong>
        </h2>
        <p className='opacity-80'>Set up your connected accounts to clone and use repositories.</p>
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

  return <section>
    <div className='level relaxed'>
      <div>
        <h2 className='text-2xl'>Workspaces</h2>
        <p className='opacity-80'>Set up your connected accounts to clone and use repositories.</p>
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
        <div className='col-span-3'>Workspace</div>
        <div className='col-span-3'>Description</div>
        <div className='col-span-2'>Created at</div>
        <div className='col-span-2'>Updated at</div>
        <div className='col-span-2 text-right'>Actions</div>
      </div>
      <div className='divide-y'>
        {workspaces.map((workspace) => {
          const createdAt = formatTimestamp(workspace.createdAt)
          const updatedAt = formatTimestamp(workspace.updatedAt)

          return <div
            key={workspace.id}
            className='group relative grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-content2/30'
          >
            <Link
              className='col-span-3'
              to={getWorkspaceEditUrl(workspace.id)}
            >
              <div className='text-lg'>{workspace.name || 'Untitled workspace'}</div>
              <div className='opacity-60 text-sm'>
                {workspace.sourceRepoUrl || 'Repository not selected'}
              </div>
            </Link>
            <Link
              className='col-span-3'
              to={getWorkspaceEditUrl(workspace.id)}
            >
              <div className='opacity-80 text-sm'>{
                workspace.description || 'No description added yet.'
              }</div>
            </Link>
            <div className='col-span-2'>
              <Tooltip content={createdAt.full}>
                <div className='text-sm opacity-80 w-fit'>{createdAt.short}</div>
              </Tooltip>
            </div>
            <div className='col-span-2'>
              <Tooltip content={updatedAt.full}>
                <div className='text-sm opacity-80 w-fit'>{updatedAt.short}</div>
              </Tooltip>
            </div>
            <div className='col-span-2'>
              <div className='flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100'>
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
          </div>
        })}
      </div>
    </Card>
  </section>
}
