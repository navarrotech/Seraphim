// Copyright © 2026 Jalapeno Labs

// Urls
export const UrlTree = {
  root: '/',
  settings: '/settings',
  workspacesList: '/workspaces',
  workspaceCreate: '/workspaces/create',
  workspaceView: '/workspace/:workspaceId',
  workspaceEdit: '/workspace/:workspaceId/edit',
  workspaceTasksList: '/workspaces/:workspaceId/tasks',
  workspaceTaskView: '/workspaces/:workspaceId/tasks/:taskId',
} as const
export type UrlValue = typeof UrlTree[keyof typeof UrlTree]

export const ExternalLinks = {
  JalapenoLabsHome: 'https://jalapenolabs.io',
} as const
export type ExternalLinkValue = typeof ExternalLinks[keyof typeof ExternalLinks]

export type ValidApplicationLink = UrlValue | ExternalLinkValue

// Settings
export const UNKNOWN_ROUTE_REDIRECT_TO: UrlValue = UrlTree.workspacesList

// ///////////////////////////// //
//         Link factories        //
// ///////////////////////////// //

export const getWorkspaceViewUrl = (workspaceId: string) =>
  UrlTree.workspaceView.replace(':workspaceId', workspaceId)

export const getWorkspaceEditUrl = (workspaceId: string) =>
  UrlTree.workspaceEdit.replace(':workspaceId', workspaceId)

export const getWorkspaceTasksListUrl = (workspaceId: string) =>
  UrlTree.workspaceTasksList.replace(':workspaceId', workspaceId)

export const getWorkspaceTaskViewUrl = (
  workspaceId: string,
  taskId: string,
) =>
  UrlTree.workspaceTaskView
    .replace(':workspaceId', workspaceId)
    .replace(':taskId', taskId)
