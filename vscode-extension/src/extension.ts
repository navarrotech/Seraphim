// Copyright © 2025 Jalapeno Labs

import * as path from 'path'
import * as vscode from 'vscode'
import express from 'express'
import http from 'http'

const startingPort = 9842
let port = startingPort

const app = express()
const server = http.createServer(app)

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Seraphim')
	function log(message: any) {
		if (typeof message === 'object') {
			if (message instanceof Error) {
				message = `Error: ${message.name} - ${message.message}`
				if (message.stack) {
					message = `Stack: ${message.stack}`
				}
				return
			}
			try {
				message = JSON.stringify(message, null, 2)
			}
			catch (error) {
				message = `Error stringifying message: ${error}`
			}
		}
		outputChannel.appendLine(
			String(message)
		)
		console.log(message)
	}

	app.get('/', (req, res) => {
		res.send('Hello from seraphim-vscode!')
	})

	app.use(express.json())

	app.get('/cwd', (req, res) => {
		// Return all workspaces
		const paths: string[] = []
		vscode.workspace.workspaceFolders?.forEach((folder) => {
			log(`Workspace folder: ${folder.uri.fsPath}`)
			paths.push(folder.uri.fsPath)
		})

		const workspaceName = vscode.workspace.name || 'Unnamed Workspace'

		const isFocused: boolean = !!vscode.window.state.focused
		log(`Is focused: ${isFocused}`)

		const selectedText = getAllTextSelections()
		log(`Selected text: '${selectedText}'`)

		const focusedFilePath = vscode.window.activeTextEditor?.document.uri.fsPath
		log(`Focused file path: ${focusedFilePath}`)

		res.json({
			paths,
			isFocused,
			focusedFilePath,
			selectedText,
			workspaceName
		})
	})

	app.post('/goto', (request, response) => {
		const filePath = request.body?.filePath
		if (filePath) {
			openInThisWindow(filePath)
		}
		response.sendStatus(200)
	})

	// If the port is taken, try the next port
	server.on('error', (error: any) => {
		if (error.code === 'EADDRINUSE') {
			port += 1
			log(`Port ${port - 1} is in use, trying port ${port}...`)
			listen()
		}
		log(error)
	})

	function listen() {
		server.listen(port, () => {
			log(`Server is running at http://localhost:${port}`)
			vscode.window.showInformationMessage(`Seraphim server is running at http://localhost:${port}`)
		})
	}

	listen()

	const disposable = vscode.commands.registerCommand('seraphim-vscode.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from seraphim-vscode!')
	})

	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {
	server?.close()
}

function getAllTextSelections(): string[] {
	// get the active editor (if there is one)
	const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor
	if (!editor) {
		return []  // no editor open
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
      || filePath.startsWith(root + path.sep)
  })

  if (!folder) {
    // this VSCode window doesn’t have that folder open, so bail out
    return false
  }

  // load the document, then show it and force focus into the editor
	try {
		const doc = await vscode.workspace.openTextDocument(uri)
		vscode.window.showTextDocument(doc, {
			preview: false,       // open as a proper tab, not a preview
			preserveFocus: false  // false → move focus into the editor group
		})
		return true
	}
	catch (error) {
		vscode.window.showErrorMessage(`Failed to open file: ${error}`)
	}
	return false
}
