// Copyright © 2026 Jalapeno Labs

// Core
import { Navigate, Route, Routes } from 'react-router'

// User interface
import { ConnectedAccounts } from './pages/accounts/ConnectedAccounts'
import { DashboardGate } from './pages/gates/DashboardGate'
import { Llms } from './pages/llms/Llms'
import { Settings } from './pages/Settings'
import { SettingsAdvanced } from './pages/settings/SettingsAdvanced'
import { SettingsGeneral } from './pages/settings/SettingsGeneral'
import { Tasks } from './pages/tasks/Tasks'
import { CreateWorkspace } from './pages/workspaces/CreateWorkspace'
import { EditWorkspace } from './pages/workspaces/EditWorkspace'
import { ListWorkspaces } from './pages/workspaces/ListWorkspaces'

// Misc
import { UNKNOWN_ROUTE_REDIRECT_TO, UrlTree } from '@common/urls'

export function Router() {
  return <>
    <Routes>
      <Route path={UrlTree.root} element={<DashboardGate />}>
        <Route index element={<Navigate to={UrlTree.tasksList} replace />} />
        <Route path={UrlTree.settings} element={<Settings />}>
          <Route index element={<Navigate to={UrlTree.settingsGeneral} replace />} />
          <Route path={UrlTree.settingsGeneral} element={<SettingsGeneral />} />
          <Route path={UrlTree.settingsAdvanced} element={<SettingsAdvanced />} />
          <Route path={UrlTree.settingsGitRepos} element={<ConnectedAccounts />} />
          <Route path={UrlTree.settingsLlms} element={<Llms />} />
          <Route path={UrlTree.workspacesList} element={<ListWorkspaces />} />
          <Route path={UrlTree.workspaceCreate} element={<CreateWorkspace />} />
          <Route path={UrlTree.workspaceEdit} element={<EditWorkspace />} />
        </Route>
        <Route path={UrlTree.llms} element={<Llms />} />
        <Route path={UrlTree.tasksList} element={<Tasks />} />
        <Route path={UrlTree.taskView} element={<Tasks />} />
      </Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </>
}
