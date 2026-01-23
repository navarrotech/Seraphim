// Copyright © 2026 Jalapeno Labs

// Core
import { Navigate, Routes, Route } from 'react-router'

// User interface
import { DashboardGate } from './pages/gates/DashboardGate'
import { CreateWorkspace } from './pages/workspaces/CreateWorkspace'
import { EditWorkspace } from './pages/workspaces/EditWorkspace'
import { ListWorkspaces } from './pages/workspaces/ListWorkspaces'
import { ListWorkspaceTasks } from './pages/workspaces/ListWorkspaceTasks'
import { Settings } from './pages/Settings'
import { ViewWorkspace } from './pages/workspaces/ViewWorkspace'
import { ViewWorkspaceTask } from './pages/workspaces/ViewWorkspaceTask'

// Misc
import { UrlTree, UNKNOWN_ROUTE_REDIRECT_TO } from '@common/urls'

export function Router() {
  return <>
    <Routes>
      <Route path={UrlTree.root} element={<DashboardGate />}>
        <Route index element={<Navigate to={UrlTree.workspacesList} replace />} />
        <Route path={UrlTree.settings} element={<Settings />} />
        <Route path={UrlTree.workspacesList} element={<ListWorkspaces />} />
        <Route path={UrlTree.workspaceCreate} element={<CreateWorkspace />} />
        <Route path={UrlTree.workspaceEdit} element={<EditWorkspace />} />
        <Route path={UrlTree.workspaceView} element={<ViewWorkspace />} />
        <Route path={UrlTree.workspaceTasksList} element={<ListWorkspaceTasks />} />
        <Route path={UrlTree.workspaceTaskView} element={<ViewWorkspaceTask />} />
      </Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </>
}
