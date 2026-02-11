// Copyright © 2026 Jalapeno Labs

import type { SpawnOptions } from 'child_process'

// Core
import chalk from 'chalk'
import { spawn } from 'child_process'
import EventEmitter from 'events'

// Node.js
import { singleThreadedInterval } from '../singleThreadedInterval'
import { resolve } from 'path'

// Misc
import stripAnsi from 'strip-ansi'

type CustomOptions = {
  killSignal?: NodeJS.Signals
  disconnectOnKill?: boolean
  /**
   * If true, the process will be spawned in its own process group and halt()
   * will attempt to signal the whole group (so subprocesses receive the signal too).
   */
  killProcessGroup?: boolean
  args?: string[]
  useRedux?: boolean
  meta?: Record<string, any>
}

type EventMap = {
  close: [ ChildProcess ]
  stdout: [ string ]
  stderr: [ string ]
}

// This is a wrapper around the Node.js child_process module.
// It provides a more convenient interface for spawning child processes,
// handling their output, and waiting for specific text or conditions.
// It also handles signals like SIGINT and SIGTERM to gracefully terminate the child process.
// It emits events for stdout, stderr, and close events.
export class ChildProcess extends EventEmitter<EventMap> {
  // Instructions
  public readonly command: string
  public readonly args: string[]
  public readonly options: SpawnOptions
  public readonly fullCommand: string
  public readonly useRedux: boolean = false
  public readonly disconnectOnKill: boolean = false
  public readonly killProcessGroup: boolean = false
  public killSignal: NodeJS.Signals = 'SIGINT'
  public meta: Record<string, any> = {}

  // State
  public pid: number | null = null
  public halted: boolean = false
  public child: ReturnType<typeof spawn> | null = null

  // Output
  public exitCode: number | null = null
  public outAndErr: string[] = []
  public out: string[] = []
  public err: string[] = []

  constructor(
    command: string,
    options: SpawnOptions & CustomOptions = {},
  ) {
    super()

    const {
      killSignal = 'SIGINT',
      disconnectOnKill = false,
      killProcessGroup = false,
      useRedux = false,
      args = [],
      meta = {},
      ...spawnOptions
    } = options

    // If requested, spawn the process in its own group.
    // This makes `process.kill(-pid, signal)` target the whole group.
    if (killProcessGroup && spawnOptions.detached == null) {
      spawnOptions.detached = true
    }

    if (spawnOptions.cwd && typeof spawnOptions.cwd === 'string') {
      spawnOptions.cwd = resolve(spawnOptions.cwd)
    }

    if (!spawnOptions.stdio) {
      // stdio options are based on:
      // [ stdin, stdout, stderr ]
      // This will ignore all stdin
      // This will pipe stdout and stderr to the parent process
      spawnOptions.stdio = [ 'inherit', 'pipe', 'pipe' ]
    }

    this.command = command
    this.fullCommand = `${command} ${args.join(' ')}`.trim()
    this.killSignal = killSignal
    this.args = args
    this.options = spawnOptions
    this.useRedux = useRedux
    this.meta = meta
    this.disconnectOnKill = disconnectOnKill
    this.killProcessGroup = killProcessGroup

    childProcesses.push(this)

    this.execute()
  }

  // //////////////////////// //
  //      Private Methods     //
  // //////////////////////// //

  private execute() {
    console.debug('Starting child process with command: '
      + `${chalk.cyan(this.command)} ${chalk.magenta(this.args.join(' '))}`)

    const child = spawn(
      this.command,
      this.args,
      this.options,
    )

    this.pid = child.pid ?? null
    console.debug('Child process started with PID:', this.pid)

    // Subscribe to the piped child data output
    if (child.stdout) {
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (data: string) => this.onStdout(data))
    }

    if (child.stderr) {
      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (data: string) => this.onStderr(data))
    }

    const terminateCallback = this.onParentProcessTerminated.bind(this)

    // Listen into SIGINT from the parent process
    process.on('SIGINT', terminateCallback)
    process.on('SIGTERM', terminateCallback)
    // Ctrl+\ in a terminal sends SIGQUIT; without handling it we can orphan detached children.
    process.on('SIGQUIT', terminateCallback)
    // Common "terminal/session closed" signal on POSIX.
    process.on('SIGHUP', terminateCallback)

    // Listen to any "failed to spawn" errors
    child.on('error', (error) => {
      process.off('SIGINT', terminateCallback)
      process.off('SIGTERM', terminateCallback)
      process.off('SIGQUIT', terminateCallback)
      process.off('SIGHUP', terminateCallback)
      console.log('Process error: ', error)
      this.onStderr(error.message)
      this.exitCode = 1
      this.emit('close', this)
      this.halted = true
    })

    // Listen to when the child process exits
    child.on('close', (code, signal) => {
      process.off('SIGINT', terminateCallback)
      process.off('SIGTERM', terminateCallback)
      process.off('SIGQUIT', terminateCallback)
      process.off('SIGHUP', terminateCallback)
      this.exitCode = code ?? child.exitCode ?? 0
      this.emit('close', this)

      console.debug([
        `Child process closed itself with code ${this.exitCode}`,
        signal && `and signal ${signal}`,
        chalk.magenta(`(${this.fullCommand})`),
      ].filter(Boolean).join(' '))

      this.halted = true
    })

    this.child = child
  }

  private onParentProcessTerminated() {
    console.log('Parent kill signal received, terminating child process', this.fullCommand)
    if (this.isRunning()) {
      if (this.killProcessGroup && this.pid) {
        try {
          process.kill(-this.pid, 'SIGTERM')
          return
        }
        catch (e) {
          console.debug(`Failed to kill process group -${this.pid} with SIGTERM:`, e)
        }
      }
      this.child.kill('SIGTERM')
    }
  }

  private format(input: string): string {
    return stripAnsi(input)
  }

  private onStdout(chunk: string) {
    if (this.halted) {
      return
    }
    const formattedChunk = this.format(chunk)
    this.out.push(
      formattedChunk,
    )
    this.outAndErr.push(
      formattedChunk,
    )
    console.debug('⚙️ ', chunk)
    this.emit('stdout', formattedChunk)
  }

  private onStderr(chunk: string) {
    if (this.halted) {
      return
    }
    const formattedChunk = this.format(chunk)
    this.err.push(
      formattedChunk,
    )
    this.outAndErr.push(
      formattedChunk,
    )
    console.debug('⚠️ ', chunk)
    this.emit('stderr', formattedChunk)
  }

  // //////////////////////// //
  //      Public Methods      //
  // //////////////////////// //

  public isRunning(): boolean {
    return this.child && this.exitCode === null
  }

  public halt(signal?: NodeJS.Signals): boolean {
    console.debug(
      `Child process (${this.pid}) commanded to halt with ${signal}:\n     `,
      chalk.magenta(this.fullCommand),
    )
    try {
      const sig = signal ?? this.killSignal

      // Prefer signaling the whole process group if configured.
      if (this.killProcessGroup && this.pid) {
        try {
          process.kill(-this.pid, sig)
        }
        catch (e) {
          // Fallback to killing only the child; group kill can fail if not detached/group leader.
          console.debug(`Failed to kill process group -${this.pid} with ${sig}:`, e)
        }
      }

      // Also signal the direct child (best-effort).
      this.child.kill(sig)
    }
    catch (error) {
      console.error(`Failed to kill child process (${this.pid}):`, error)
    }

    // The backend spawns a separate listener process.
    // With process-group signaling enabled (see killProcessGroup),
    // subprocesses should receive the same signal and exit naturally.

    this.halted = true
    return true
  }

  // Deferred promises!
  public async waitForText(partial: string, timeoutMs: number = 60_000): Promise<this> {
    return new Promise((accept, reject) => {
      // Timeout handling!
      let timer: ReturnType<typeof setTimeout>
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          reject(
            new Error(
              `Timeout (${timeoutMs}) waiting for text: "${partial}" in command: ${this.fullCommand}`,
            ),
          )
        }, timeoutMs)
      }

      // Listener handling!
      let listener = (data: string) => {
        if (data.includes(partial)) {
          this.off('stdout', listener)
          clearTimeout(timer)
          accept(this)
        }
      }

      listener = listener.bind(this)

      // Child closing handling!
      this.once('close', () => {
        clearTimeout(timer)
        this.off('stdout', listener)
        reject(
          new Error(`Child process closed before text was found: "${partial}"`),
        )
      })

      this.on('stdout', listener)
    })
  }

  public async waitForPoll(
    pollFn: () => Promise<boolean>,
    pollInterval: null | number = 250,
    timeoutMs: number = 120_000,
  ): Promise<this> {
    console.debug(`Waiting for poll function with timeout of ${timeoutMs} ms in command: ${this.fullCommand}`)
    return new Promise((accept, reject) => {
      let handled = false

      // Timeout handling!
      let timer: ReturnType<typeof setTimeout>
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          handled = true
          reject(
            new Error(
              `Timeout (${timeoutMs}) waiting for poll function in command: ${this.fullCommand}`,
            ),
          )
        }, timeoutMs)
      }

      // Polling loop
      const interval = singleThreadedInterval(async () => {
        let result = false
        try {
          result = await pollFn()
        }
        catch {
          result = false
        }

        if (result) {
          handled = true
          clearInterval(interval)
          clearTimeout(timer)
          accept(this)
        }
      }, pollInterval)

      // Child closing handling!
      this.once('close', () => {
        if (handled) {
          return
        }
        clearInterval(interval)
        clearTimeout(timer)
        reject(
          new Error('Child process closed before poll function returned true'),
        )
      })
    })
  }

  public async waitForExit(): Promise<number> {
    if (!this.isRunning()) {
      return this.exitCode ?? 0
    }

    return new Promise((accept) => {
      this.once('close', () => {
        accept(this.exitCode ?? 0)
      })
    })
  }
}

// Graceful shutdown handling:
const childProcesses: ChildProcess[] = []
export async function quitAllChildProcesses(): Promise<void> {
  if (!childProcesses.length) {
    console.debug('No child processes to quit')
    return
  }

  const waits: Array<Promise<number>> = []

  for (const childProcess of childProcesses) {
    if (childProcess.isRunning()) {
      console.info('Quitting child process:', childProcess.fullCommand)
      childProcess.halt('SIGKILL')
      waits.push(childProcess.waitForExit())
    }
  }

  // Wait for all exits (settled so one failure doesn't block shutdown)
  await Promise.allSettled(waits)
}
