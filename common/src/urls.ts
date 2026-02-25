// Copyright © 2026 Jalapeno Labs

// Urls
export const UrlTree = {
  root: '/',

  tasks: '/tasks',
  newTasks: '/tasks/new',
  viewTask: '/tasks/:taskId',

  settings: '/settings',
  generalSettings: '/settings/general',
  promptSettings: '/settings/prompts',

  gitAccounts: '/settings/git',
  workspaces: '/settings/workspaces',
  llms: '/settings/llms',
  issueTracking: '/settings/issue-tracking',
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
