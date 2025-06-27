// Copyright © 2025 Jalapeno Labs

import { runCommand } from './process'
import { searchUpwardsForFile, searchUpwardsForFiles } from './searchUpwardsForFile'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { safeParseJson } from './json'

type CommandSet = null | [string, string[]]

export async function getBestVitestPath(
  testFilePath: string,
  workspacePath: string
): Promise<[string, string[], string]> {
  // 1) Try upwards from the test file path for vitest.config.(t|j)s
  // 2) Try upwards from the workspace path for a vitest.config.(t|j)s
  // 3) Try upwards from the test file path for top most package.json
  // 4) Try upwards from the workspace path for top most package.json
  // 5) Try the workspace path

  const testFileDir = path.dirname(testFilePath)
  let testFilePathVitestConfig = await searchUpwardsForFiles(
    testFileDir,
    [ 'vitest.config.ts', 'vitest.config.js' ],
    true
  )
  let workspacePathVitestConfig = await searchUpwardsForFiles(
    workspacePath,
    [ 'vitest.config.ts', 'vitest.config.js' ],
    true
  )
  let testFilePathPackageJson = await searchUpwardsForFile(
    testFileDir,
    'package.json'
  )
  let workspacePathPackageJson = await searchUpwardsForFile(
    workspacePath,
    'package.json'
  )

  if (testFilePathVitestConfig) {
    // console.debug(`Found vitest.config at: ${testFilePathVitestConfig}`)
    testFilePathVitestConfig = path.dirname(testFilePathVitestConfig)
  }
  if (workspacePathVitestConfig) {
    // console.debug(`Found workspace vitest.config at: ${workspacePathVitestConfig}`)
    workspacePathVitestConfig = path.dirname(workspacePathVitestConfig)
  }
  if (testFilePathPackageJson) {
    // console.debug(`Found package.json at: ${testFilePathPackageJson}`)
    testFilePathPackageJson = path.dirname(testFilePathPackageJson)
  }
  if (workspacePathPackageJson) {
    // console.debug(`Found workspace package.json at: ${workspacePathPackageJson}`)
    workspacePathPackageJson = path.dirname(workspacePathPackageJson)
  }

  type RankedCommandSet = {
    rank: number
    cwd: string
    result: CommandSet
  }

  async function tryWithRank(
    rank: number,
    callback: () => Promise<CommandSet>,
    cwd: string
  ): Promise<RankedCommandSet | null> {
    const result = await callback()
    if (result) {
      return { rank, result, cwd }
    }
    return null
  }

  const results = await Promise.allSettled([
    // 1) Check for vitest.config.ts or vitest.config.js in the test file path
    tryWithRank(1, () => getLocallyInstalledVitest(testFilePathVitestConfig), testFilePathVitestConfig),
    tryWithRank(6, () => getNpxVitest(testFilePathVitestConfig), testFilePathVitestConfig),
    tryWithRank(11, () => getVitestFromNodeModules(testFilePathVitestConfig), testFilePathVitestConfig),
    tryWithRank(16, () => getGloballyInstalledVitest(testFilePathVitestConfig), testFilePathVitestConfig),

    // 2) Check for vitest.config.ts or vitest.config.js in the workspace path
    tryWithRank(2, () => getLocallyInstalledVitest(workspacePathVitestConfig), workspacePathVitestConfig),
    tryWithRank(7, () => getNpxVitest(workspacePathVitestConfig), workspacePathVitestConfig),
    tryWithRank(12, () => getVitestFromNodeModules(workspacePathVitestConfig), workspacePathVitestConfig),
    tryWithRank(17, () => getGloballyInstalledVitest(workspacePathVitestConfig), workspacePathVitestConfig),

    // 3) Check for package.json in the test file path
    tryWithRank(3, () => getLocallyInstalledVitest(testFilePathPackageJson), testFilePathPackageJson),
    tryWithRank(8, () => getNpxVitest(testFilePathPackageJson), testFilePathPackageJson),
    tryWithRank(13, () => getVitestFromNodeModules(testFilePathPackageJson), testFilePathPackageJson),
    tryWithRank(18, () => getGloballyInstalledVitest(testFilePathPackageJson), testFilePathPackageJson),

    // 4) Check for package.json in the workspace path
    tryWithRank(4, () => getLocallyInstalledVitest(workspacePathPackageJson), workspacePathPackageJson),
    tryWithRank(9, () => getNpxVitest(workspacePathPackageJson), workspacePathPackageJson),
    tryWithRank(14, () => getVitestFromNodeModules(workspacePathPackageJson), workspacePathPackageJson),
    tryWithRank(19, () => getGloballyInstalledVitest(workspacePathPackageJson), workspacePathPackageJson),

    // 5) Check for vitest in the workspace path
    tryWithRank(5, () => getLocallyInstalledVitest(workspacePath), workspacePath),
    tryWithRank(10, () => getNpxVitest(workspacePath), workspacePath),
    tryWithRank(15, () => getVitestFromNodeModules(workspacePath), workspacePath),
    tryWithRank(20, () => getGloballyInstalledVitest(workspacePath), workspacePath)
  ])

  let bestResult: RankedCommandSet | null = null
  for (const result of results) {
    if (result.status !== 'fulfilled') {
      continue
    }
    if (!result.value) {
      continue
    }
    if (!bestResult || result.value.rank < bestResult.rank) {
      bestResult = result.value
    }
  }

  if (!bestResult) {
    throw new Error('Vitest is not installed locally or globally.')
  }

  console.log(`The best Vitest found to use is:
Cwd: ${bestResult.cwd} (Rank ${bestResult.rank})
Cmd: ${bestResult.result[0]}
Args: ${bestResult.result[1].join(' ')}
  `.trim())

  return [ ...bestResult.result, bestResult.cwd ]
}

async function getLocallyInstalledVitest(cwd: string): Promise<CommandSet> {
  const nodeModules = path.resolve(cwd, 'node_modules')

  if (!existsSync(nodeModules)) {
    return null
  }

  const packageJson = path.resolve(cwd, 'package.json')
  if (!existsSync(packageJson)) {
    return null
  }

  const packageJsonRaw = await fs.readFile(packageJson, 'utf-8')
  const packageJsonContent = safeParseJson(packageJsonRaw)
  if (
    !packageJsonContent?.devDependencies?.vitest
    && !packageJsonContent?.dependencies?.vitest
  ) {
    return null
  }

  const yarnLock = path.resolve(cwd, 'yarn.lock')

  const cmd = yarnLock
    ? 'yarn'
    : 'npm'

  const [ , exitCode ] = await runCommand(
    cmd,
    [ 'vitest', '--version' ],
    { cwd }
  )

  if (exitCode === 0) {
    return [ cmd, [ 'vitest' ]]
  }

  return null
}

async function getNpxVitest(cwd: string): Promise<CommandSet> {
  const [ , localExit ] = await runCommand(
    'npx',
    [ '--no-install', 'vitest', '--version' ],
    { cwd }
  )
  if (localExit === 0) {
    return [ 'npx', [ '--no-install', 'vitest' ]]
  }

  return null
}

async function getGloballyInstalledVitest(cwd: string): Promise<CommandSet> {
  const [ , globalExit ] = await runCommand(
    'vitest',
    [ '--version' ],
    { cwd }
  )
  if (globalExit === 0) {
    return [ 'vitest', []]
  }

  return null
}

async function getVitestFromNodeModules(cwd: string): Promise<CommandSet> {
  // On Unix/macOS, local binaries live under node_modules/.bin/vitest
  // On Windows, it’ll actually be vitest.cmd
  const bin = path.resolve(
    cwd,
    'node_modules/.bin/vitest'
  )

  if (existsSync(bin)) {
    const [ , binExit ] = await runCommand(bin, [ '--version' ], { cwd })
    if (binExit === 0) {
      return [ bin, []]
    }
  }

  const winBin = path.resolve(
    cwd,
    'node_modules/.bin/vitest.cmd'
  )

  if (existsSync(winBin)) {
    const [ , winBinExit ] = await runCommand(winBin, [ '--version' ], { cwd })
    if (winBinExit === 0) {
      return [ winBin, []]
    }
  }

  return null
}

export async function runVitest(
  vitestFilePath: string,
  cwd: string,
  cmd: string,
  cmdArgs: string[],
  testNamePattern?: string
) {
  // npx vitest -t "adds two numbers"
  // vitest --run --testNamePattern="adds two numbers"
  // npx vitest -t "/adds.*numbers/"
  // npx vitest path/to/my-utils.test.ts

  const args = [
    ...cmdArgs,
    'run',
    testNamePattern && `--testNamePattern=${testNamePattern}`,
    vitestFilePath
  ].filter(Boolean)

  return await runCommand(cmd, args, {
    cwd
  })
}
