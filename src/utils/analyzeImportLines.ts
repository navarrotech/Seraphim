// Copyright © 2025 Jalapeno Labs

import type { FunctionPointer, LineReference } from '@/types'

// Core
import { Project } from 'ts-morph'

// Lib
import { extractFunction } from './extractFunction'
import { searchUpwardsForFile } from './searchUpwardsForFile'

// Misc
import { MAX_IMPORT_LINES_TO_USE } from '@/constants'

export async function gatherImportLines(
  importLines: LineReference[]
): Promise<string> {
  importLines = importLines.slice(0, MAX_IMPORT_LINES_TO_USE)

  const pointers: FunctionPointer[] = []

  for (const line of importLines) {
    const tsConfigFilePath = searchUpwardsForFile(line.sourceFilePath, 'tsconfig.json')

    console.log('-----------------------------------')
    console.log('Processing import line:', line.importLine)
    console.log('Source file path:', line.sourceFilePath)
    console.log('TSConfig file path:', tsConfigFilePath)
    console.log('-----------------------------------')

    // initialize ts-morph with your tsconfig so that aliased paths (e.g. "@/*") are applied
    const project = new Project({
      tsConfigFilePath
    })

    // group all import lines by the file they came from
    const importsByFile = new Map<string, string[]>()
    importLines.forEach(({ sourceFilePath, importLine }) => {
      if (!importsByFile.has(sourceFilePath)) {
        importsByFile.set(sourceFilePath, [])
      }
      importsByFile.get(sourceFilePath)!.push(importLine)
    })


    // for each file, create a virtual source file at its real path
    importsByFile.forEach((lines, sourceFilePath) => {
    // assemble an in-memory TS file containing just those import statements
      const src = project.createSourceFile(
        sourceFilePath,
        lines.join('\n'),
        { overwrite: true }
      )

      // walk its imports and resolve each module to an absolute file path
      src.getImportDeclarations().forEach((decl) => {
      // this reads your tsconfig "paths" and the real fs to find the target .ts/.js
        const resolved = decl.getModuleSpecifierSourceFile()
        if (!resolved) {
          return
        }

        // get the OS-absolute path (e.g. "/app/src/thing.ts")
        const absolutePath = resolved.getFilePath()

        // for each named import, push one pointer entry
        decl.getNamedImports().forEach((named) => {
          pointers.push({
            absolutePath,
            functionName: named.getName()
          })
        })
      })
    })
  }

  console.log('-----------------------------------')
  console.log('Gathered import lines:', { pointers })
  console.log('-----------------------------------')

  let result = ''
  for (const { absolutePath, functionName } of pointers) {
    result += extractFunction(absolutePath, functionName) + '\n'
  }

  return result
}
