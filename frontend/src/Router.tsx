// Copyright © 2026 Jalapeno Labs

// Core
import { Navigate, Routes, Route } from 'react-router'
import { useNavigate, useHref } from 'react-router-dom'

// User interface
import { HeroUIProvider, ToastProvider } from '@heroui/react'
import { EditWorkspace } from './pages/workspaces/EditWorkspace'
import { ListWorkspaces } from './pages/workspaces/ListWorkspaces'
import { ListWorkspaceTasks } from './pages/workspaces/ListWorkspaceTasks'
import { Settings } from './pages/Settings'
import { ViewWorkspace } from './pages/workspaces/ViewWorkspace'
import { ViewWorkspaceTask } from './pages/workspaces/ViewWorkspaceTask'

// Misc
import { UrlTree, UNKNOWN_ROUTE_REDIRECT_TO } from '@common/urls'

export function Router() {
  // Note: useNavigate can only be used in the context (child) of a Router
  const navigate = useNavigate()

  return <HeroUIProvider navigate={navigate} useHref={useHref}>
    <ToastProvider />
    <Routes>
      <Route path={UrlTree.root}>
        <Route index element={<Navigate to={UrlTree.workspacesList} replace />} />
        <Route path={UrlTree.settings} element={<Settings />} />
        <Route path={UrlTree.workspacesList} element={<ListWorkspaces />} />
        <Route path={UrlTree.workspaceEdit} element={<EditWorkspace />} />
        <Route path={UrlTree.workspaceView} element={<ViewWorkspace />} />
        <Route path={UrlTree.workspaceTasksList} element={<ListWorkspaceTasks />} />
        <Route path={UrlTree.workspaceTaskView} element={<ViewWorkspaceTask />} />
      </Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </HeroUIProvider>
}
