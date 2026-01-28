// Copyright © 2026 Jalapeno Labs

// Core
import { Navigate, Routes, Route } from 'react-router'

// User interface
import { DashboardGate } from './pages/gates/DashboardGate'
import { Connections } from './pages/connections/Connections'
import { ConnectedAccounts } from './pages/accounts/ConnectedAccounts'
import { CreateWorkspace } from './pages/workspaces/CreateWorkspace'
import { EditWorkspace } from './pages/workspaces/EditWorkspace'
import { ListWorkspaces } from './pages/workspaces/ListWorkspaces'
import { Tasks } from './pages/tasks/Tasks'
import { Settings } from './pages/Settings'

// Misc
import { UrlTree, UNKNOWN_ROUTE_REDIRECT_TO } from '@common/urls'

export function Router() {
  return <>
    <Routes>
      <Route path={UrlTree.root} element={<DashboardGate />}>
        <Route index element={<Navigate to={UrlTree.tasksList} replace />} />
        <Route path={UrlTree.settings} element={<Settings />} />
        <Route path={UrlTree.connectedAccounts} element={<ConnectedAccounts />} />
        <Route path={UrlTree.connections} element={<Connections />} />
        <Route path={UrlTree.workspacesList} element={<ListWorkspaces />} />
        <Route path={UrlTree.workspaceCreate} element={<CreateWorkspace />} />
        <Route path={UrlTree.workspaceEdit} element={<EditWorkspace />} />
        <Route path={UrlTree.tasksList} element={<Tasks />} />
        <Route path={UrlTree.taskView} element={<Tasks />} />
      </Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </>
}
