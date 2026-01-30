// Copyright © 2026 Jalapeno Labs

import type { Connection } from '@prisma/client'

// Core
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Utility
import { getCodexConfig } from './getCodexConfig'

type CallCodexArgs = {
  connection: Connection
  prompt: string
  workingDirectory?: string
  timeoutMs?: number
}

type CodexExecutionResult = {
  lastMessage: string
  stdout: string
  stderr: string
  exitCode: number
}

type CodexCommand = {
  command: string
  argsPrefix: string[]
}

export async function callCodex(args: CallCodexArgs): Promise<CodexExecutionResult> {
  const codexConfig = getCodexConfig(args.connection)
  if (!codexConfig) {
    console.debug('CallCodex could not resolve config from connection', {
      connectionId: args.connection.id,
      connectionType: args.connection.type,
    })
    throw new Error('Codex configuration could not be resolved')
  }

  const codexHome = await mkdtemp(join(tmpdir(), 'seraphim-codex-'))
  const outputFilePath = join(codexHome, 'last-message.txt')
  const { command, argsPrefix } = resolveCodexCommand()

  if (!command) {
    console.debug('Codex executable could not be resolved')
    await cleanupCodexTemp(codexHome)
    throw new Error('Codex executable is missing')
  }

  try {
    await writeCodexFiles(codexHome, codexConfig.files)
    const execution = await runCodexExec({
      argsPrefix,
      command,
      codexHome,
      environment: codexConfig.environment,
      outputFilePath,
      prompt: args.prompt,
      timeoutMs: args.timeoutMs,
      workingDirectory: args.workingDirectory,
    })

    if (execution.exitCode !== 0) {
      console.debug('Codex exec failed', {
        exitCode: execution.exitCode,
        stderr: execution.stderr,
      })
      throw new Error('Codex exec failed')
    }

    return execution
  }
  finally {
    await cleanupCodexTemp(codexHome)
  }
}

async function writeCodexFiles(
  codexHome: string,
  files: Record<string, string | null>,
): Promise<void> {
  const entries = Object.entries(files)
  for (const [ filename, contents ] of entries) {
    if (!contents) {
      continue
    }
    const targetPath = join(codexHome, filename)
    await writeFile(targetPath, contents, 'utf8')
  }
}

type RunCodexExecArgs = {
  argsPrefix: string[]
  command: string
  codexHome: string
  environment: Record<string, string>
  outputFilePath: string
  prompt: string
  timeoutMs?: number
  workingDirectory?: string
}

function runCodexExec(args: RunCodexExecArgs): Promise<CodexExecutionResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const codexArgs = [
      ...args.argsPrefix,
      'exec',
      '--ask-for-approval',
      'never',
      '--sandbox',
      'read-only',
      '--json',
      '--output-last-message',
      args.outputFilePath,
    ]

    if (args.workingDirectory) {
      codexArgs.push('--cd', args.workingDirectory)
    }

    codexArgs.push(args.prompt)

    const child = spawn(args.command, codexArgs, {
      env: {
        ...process.env,
        ...args.environment,
        CODEX_HOME: args.codexHome,
      },
      stdio: [ 'ignore', 'pipe', 'pipe' ],
    })

    let stdout = ''
    let stderr = ''
    let timeoutId: NodeJS.Timeout | null = null

    if (args.timeoutMs && args.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        console.debug('Codex exec timed out, terminating process', {
          timeoutMs: args.timeoutMs,
        })
        child.kill('SIGTERM')
      }, args.timeoutMs)
    }

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      console.debug('Codex exec failed to spawn', { error })
      rejectPromise(error)
    })

    child.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      const lastMessage = readLastMessage(args.outputFilePath)
      resolvePromise({
        lastMessage,
        stdout,
        stderr,
        exitCode: code ?? 1,
      })
    })
  })
}

async function cleanupCodexTemp(codexHome: string): Promise<void> {
  try {
    await rm(codexHome, { recursive: true, force: true })
  }
  catch (error) {
    console.debug('Failed to remove codex temp directory', {
      codexHome,
      error,
    })
  }
}

function resolveCodexCommand(): CodexCommand {
  const binName = process.platform === 'win32' ? 'codex.cmd' : 'codex'
  const binPath = resolve(process.cwd(), 'node_modules', '.bin', binName)

  if (existsSync(binPath)) {
    return {
      command: binPath,
      argsPrefix: [],
    }
  }

  const entryPath = resolve(
    process.cwd(),
    'node_modules',
    '@openai',
    'codex',
    'bin',
    'codex.js',
  )

  if (existsSync(entryPath)) {
    return {
      command: process.execPath,
      argsPrefix: [ entryPath ],
    }
  }

  return {
    command: '',
    argsPrefix: [],
  }
}

function readLastMessage(outputFilePath: string): string {
  try {
    if (!existsSync(outputFilePath)) {
      console.debug('Codex did not write a last message file', {
        outputFilePath,
      })
      return ''
    }

    return readFileSync(outputFilePath, 'utf8').trim()
  }
  catch (error) {
    console.debug('Failed to read codex last message file', {
      outputFilePath,
      error,
    })
    return ''
  }
}
