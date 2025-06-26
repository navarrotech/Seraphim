// Copyright © 2025 Jalapeno Labs

import type { ChromeLogPayload, SeraphimProjectConfiguration, FunctionPointer } from './types'

import { extractUrls } from './utils/extractUrls'
import { extractFunction } from './utils/extractFunction'
import { findFileFromWorkspace } from './utils/findFileFromWorkspace'
import * as fs from 'fs/promises'

export async function extractSourceCodeReferencedInErrors(
  backendErrors: Record<string, string[]>,
  frontendErrors: ChromeLogPayload[],
  workspace: string,
  config: SeraphimProjectConfiguration
): Promise<[boolean, FunctionPointer[]]> {
  let isValid = true
  const sourceFiles: FunctionPointer[] = []
  for (const error of frontendErrors) {
    if (error.type !== 'error') {
      continue
    }
    const urls = extractUrls(error.message)
    for (const url of urls) {
      if (url.includes('node_modules/') || url.includes('dist/')) {
        continue
      }
      if (!url.includes(config.frontendUrl)) {
        continue
      }

      const path = new URL(url).pathname
      const absolutePath = await findFileFromWorkspace(workspace, path)
      if (!absolutePath) {
        console.warn(`[SOURCE]: Could not find frontend source file for URL: ${workspace}, ${path}`)
        continue
      }

      // Yeah, this inner loop totally sucks but it's a quick way to get the function name
      let fullLine = ''
      for (const line of error.message.split('\n')) {
        if (line.includes(url)) {
          fullLine = line.trim()
          break
        }
      }

      // Extract the function name from the line
      let functionName: string = fullLine
      if (functionName.startsWith('at ')) {
        functionName = functionName.slice(3).trim()
      }
      if (functionName.includes('(')) {
        functionName = functionName.split('(')[0].trim()
      }

      addUnique(sourceFiles, {
        absolutePath,
        functionName
      })

      // Only one path per error message should be returned:
      break
    }
  }

  // TODO: Parse backend errors

  if (sourceFiles.length === 0) {
    isValid = false
  }

  return [ isValid, sourceFiles ]
}

export async function getSourceCode(pointer: FunctionPointer): Promise<string | undefined> {
  const { absolutePath, functionName } = pointer
  try {
    const fileContent = await fs.readFile(absolutePath, 'utf-8')

    // Count how many times the "export" keyword appears in the file
    const exportKeywordCount = (fileContent.match(/export/g) || []).length

    // We only need to extract the function if there are multiple exports,
    // Otherwise it should be condensed enough
    if (exportKeywordCount <= 1) {
      return fileContent
    }

    return extractFunction(
      fileContent,
      functionName
    )
  }
  catch (error) {
    console.error(`Failed to read source code from ${absolutePath}: ${error.message}`)
    return undefined
  }
}

function addUnique(pointers: FunctionPointer[], item: FunctionPointer): void {
  const exists = pointers.some((existing) => existing.absolutePath === item.absolutePath)
  const isSameFunction = pointers.some((existing) => existing.functionName === item.functionName)

  if (!exists && !isSameFunction) {
    pointers.push(item)
  }
}
