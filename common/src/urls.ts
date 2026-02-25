// Copyright © 2026 Jalapeno Labs

// Urls
export const UrlTree = {
  root: '/',

  tasks: '/tasks',
  newTasks: '/tasks/new',
  viewTask: '/tasks/:taskId',

  settings: '/settings',
  generalSettings: '/settings/general',
  userSettings: '/settings/user',
  promptSettings: '/settings/prompts',

  repos: '/settings/repos',
  viewRepo: '/settings/repos/:repoId',
  workspaces: '/settings/workspaces',
  viewWorkspace: '/settings/workspaces/:workspaceId',
  llms: '/settings/llms',
  viewLlm: '/settings/llms/:llmId',
  issueTracking: '/settings/issue-tracking',
  viewIssueTracking: '/settings/issue-tracking/:issueTrackingId',
} as const
export type UrlValue = typeof UrlTree[keyof typeof UrlTree]

export const ExternalLinks = {
  JalapenoLabsHome: 'https://jalapenolabs.io',
} as const
export type ExternalLinkValue = typeof ExternalLinks[keyof typeof ExternalLinks]

export type ValidApplicationLink = UrlValue | ExternalLinkValue

// Settings
export const UNKNOWN_ROUTE_REDIRECT_TO: UrlValue = UrlTree.tasks

// ///////////////////////////// //
//         Link factories        //
// ///////////////////////////// //
