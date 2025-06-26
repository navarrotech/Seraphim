// Copyright © 2025 Jalapeno Labs

import type { WorkspaceSource } from './types'

const startingPort = 9842
const attemptPorts = 25

type GetCwdResponse = {
  workspaceName: string
  paths: string[]
  isFocused: boolean
  focusedFilePath: string | undefined
  selectedText: string[]
}

export async function getAllVsCodeWorkspaces(): Promise<WorkspaceSource[]> {
  // Each instance of VS Code opens into a new port starting from 9842, and increments by 1 for each new instance.

  const promises = []
  for (let i = 0; i < attemptPorts; i++) {
    const port = startingPort + i
    promises.push(fetch(`http://localhost:${port}/cwd`))
  }

  const results = await Promise.allSettled(promises)

  const allWorkspaces: WorkspaceSource[] = []
  for (const result of results) {
    const port = startingPort + results.indexOf(result)
    if (result.status === 'fulfilled') {
      const data: GetCwdResponse = await result.value.json()
      console.debug(`[VSCODE]: localhost:${port}=${data.paths}`)
      data.paths.forEach((path) => {
        if (!path) {
          return
        }
        allWorkspaces.push({
          port,
          vscodeExtensionUrl: `http://localhost:${port}`,
          absolutePath: path,
          isFocused: data.isFocused,
          selectedText: data.selectedText,
          workspaceName: data.workspaceName,
          focusedFilePath: data.focusedFilePath
        })
      })
    }
  }

  const uniqueWorkspaces = new Map<string, WorkspaceSource>()
  allWorkspaces.forEach((workspace) => {
    uniqueWorkspaces.set(workspace.absolutePath, workspace)
  })

  return Array.from(uniqueWorkspaces.values())
}
