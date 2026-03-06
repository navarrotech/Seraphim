// Copyright © 2026 Jalapeno Labs

// Core
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router'

// Outlets
import { AppOutlet } from './pages/AppOutlet'
import { SettingsOutlet } from './pages/settings/SettingsOutlet'

// Pages
import { ListTasksPage } from './pages/tasks/ListTasksPage'
import { NewTaskPage } from './pages/tasks/NewTaskPage'
import { ViewTaskPage } from './pages/tasks/ViewTaskPage'

import { GeneralSettingsPage } from './pages/settings/GeneralSettingsPage'
import { PromptSettingsPage } from './pages/settings/PromptSettingsPage'

import { ListGitAccountsPage } from './pages/data/git/ListGitAccountsPage'
import { ListWorkspacesPage } from './pages/data/workspaces/ListWorkspacesPage'
import { ListLLMsPage } from './pages/data/llms/ListLLMsPage'
import { ListIssueTrackingPage } from './pages/data/issueTracking/ListIssueTrackingPage'

// Misc
import { UNKNOWN_ROUTE_REDIRECT_TO, UrlTree } from '@common/urls'


export const Router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path={UrlTree.root} element={<AppOutlet />}>

        <Route path={UrlTree.tasks} element={<ListTasksPage />} />
        <Route path={UrlTree.newTask} element={<NewTaskPage />} />
        <Route path={UrlTree.viewTask} element={<ViewTaskPage />} />

        <Route path={UrlTree.settings} element={<SettingsOutlet />}>

          <Route path={UrlTree.generalSettings} element={<GeneralSettingsPage />} />
          <Route path={UrlTree.promptSettings} element={<PromptSettingsPage />} />

          <Route path={UrlTree.gitAccounts} element={<ListGitAccountsPage />} />
          <Route path={UrlTree.workspaces} element={<ListWorkspacesPage />} />
          <Route path={UrlTree.llms} element={<ListLLMsPage />} />
          <Route path={UrlTree.issueTracking} element={<ListIssueTrackingPage />} />

          <Route path={UrlTree.settings} element={<Navigate to={UrlTree.generalSettings} />} />
          <Route path='*' element={<Navigate to={UrlTree.generalSettings} />} />
        </Route>

        <Route path={UrlTree.root} element={<Navigate to={UrlTree.tasks} />} />
        <Route path='*' element={<Navigate to={UrlTree.tasks} />} />
      </Route>

      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </>,
  ),
)
