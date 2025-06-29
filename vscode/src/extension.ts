// Copyright © 2025 Jalapeno Labs

import type { WsToServerMessage, WsFromServerMessage, Workspace } from '@common/types'

// Core
import * as vscode from 'vscode'

// Protocol
import ReconnectingWebsocket from 'reconnecting-websocket'
import { safeParseJson } from '@common/json'
import { stringify } from '@common/stringify'
import { PORT } from '@common/constants'

// Lib
import { debounce } from 'lodash'
import { sep } from 'path'

// //////////////////////////// //
//            Globals           //
// //////////////////////////// //

const rws = new ReconnectingWebsocket(`ws://localhost:${PORT}/seraphim/${getWorkspaceName()}/vscode`)

let outputChannel: vscode.OutputChannel

// //////////////////////////// //
//           Activate           //
// //////////////////////////// //

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Seraphim')

  let lastActiveTime: number = Date.now()

  function sendUpdate(caller: string) {
    if (rws.readyState !== ReconnectingWebsocket.OPEN) {
      log('WebSocket is not open, cannot send update from ' + caller)
      return
    }

    const workspaceName = getWorkspaceName()

    const payload: WsToServerMessage<'vscode'> = {
      id: workspaceName,
      source: 'vscode',
      timestamp: Date.now(),
      payload: {
        type: 'vscode-report',
        workspaceName,
        workspacePaths: getWorkspaceFolders(),
        focusedFilePath: getFocusedFilePath(),
        userTextSelection: getAllTextSelections(),
        lastActiveTime
      }
    }

    rws.send(
      JSON.stringify(payload)
    )
  }
  const debouncedSendUpdate = debounce(sendUpdate, 100)

  let isOpen: boolean = false
  let shownMessage: boolean = false
  rws.addEventListener('open', () => {
    log('WebSocket connection established')
    if (!shownMessage) {
      vscode.window.showInformationMessage('Seraphim successfully connected')
      shownMessage = true
    }
    sendUpdate('open event')
    isOpen = true
  })

  vscode.window.onDidChangeTextEditorSelection(
    (event) => {
    // ignore selections in inactive editors
      if (event.textEditor !== vscode.window.activeTextEditor) {
        return
      }
      lastActiveTime = Date.now()
      debouncedSendUpdate('Text editor selection changed')
    },
    null,
    context.subscriptions
  )

  vscode.window.onDidChangeActiveTextEditor(
    () => {
      lastActiveTime = Date.now()
      debouncedSendUpdate('Active text editor changed')
    },
    null,
    context.subscriptions
  )

  rws.addEventListener('message', (event) => {
    const message: WsFromServerMessage = safeParseJson(event.data)
    switch (message.payload.type) {
    case 'vscode-focus-file':
      openInThisWindow(message.payload.filePath)
      break
    }
  })

  rws.addEventListener('close', () => {
    if (isOpen) {
      log('WebSocket connection lost')
    }
    isOpen = false
  })
}

// //////////////////////////// //
//          Deactivate          //
// //////////////////////////// //

// This method is called when your extension is deactivated
export function deactivate() {
  rws.close()
}

// //////////////////////////// //
//           Utilities          //
// //////////////////////////// //

// Return all workspaces
function getWorkspaceFolders(): Workspace[] {
  const workspaces: Workspace[] = []

  const folders = vscode.workspace.workspaceFolders || []
  for (const workspace of folders) {
    workspaces.push({
      name: workspace.name,
      path: workspace.uri.fsPath
    })
  }

  return workspaces
}

function log(message: any) {
  // If the output channel is not initialized, we can’t log
  if (!outputChannel) {
    return
  }

  message = stringify(message)

  outputChannel.appendLine(
    String(message)
  )
  console.log(message)
}

function getWorkspaceName(): string {
  return vscode.workspace.name || 'Unnamed Workspace'
}

function getIsFocused(): boolean {
  // Check if the window is focused
  return !!vscode.window.state.focused
}

function getFocusedFilePath(): string | undefined {
  // Declare no focused file if the window isn’t focused
  if (!getIsFocused()) {
    return undefined
  }
  return vscode.window.activeTextEditor?.document.uri.fsPath
}

function getAllTextSelections(): string[] {
  // get the active editor (if there is one)
  const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
  if (!editor) {
    return [] // no editor open
  }

  // get every selection (one per cursor)
  const selections: vscode.Selection[] = [ ...editor.selections ]
  if (selections.length === 0) {
    return [] // unlikely, but guard just in case
  }

  // pull the text for each selection
  const selectedTexts: string[] = selections
    .map((selection) => editor.document.getText(selection))

  return selectedTexts
}

async function openInThisWindow(filePath: string): Promise<boolean> {
  const uri = vscode.Uri.file(filePath)

  // find a workspace folder whose on‐disk path is a prefix of filePath
  const folder = vscode.workspace.workspaceFolders?.find((wf) => {
    const root = wf.uri.fsPath
    // ensure we only match whole‐folder prefixes (and not e.g. '/foo/bar2' for '/foo/bar')
    return filePath === root
      || filePath.startsWith(root + sep)
  })

  if (!folder) {
    // this VSCode window doesn’t have that folder open, so bail out
    return false
  }

  // load the document, then show it and force focus into the editor
  try {
    const doc = await vscode.workspace.openTextDocument(uri)
    vscode.window.showTextDocument(doc, {
      preview: false, // open as a proper tab, not a preview
      preserveFocus: false // false → move focus into the editor group
    })
    return true
  }
  catch (error) {
    vscode.window.showErrorMessage(`Failed to open file: ${error}`)
  }
  return false
}
