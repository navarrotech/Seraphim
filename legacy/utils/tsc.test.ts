// Copyright © 2025 Jalapeno Labs

/* eslint-disable max-len */

// Core
import { describe, it, expect } from 'vitest'
import { filterTscErrorsToJustFile } from './tsc.ts'
import path from 'path'

const sampleMultiFileTscOutput = `$ E:\\Projects\\Seraphim\\node_modules\\.bin\\tsc
src/utils/extractFunction.ts:375:9 - error TS6133: 'foo' is declared but its value is never read.

375   const foo = 'blah'
            ~~~

src/utils/tsc.ts:27:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

27     result = await runCommand('yarn', [ 'tsc', ...tscArgs ], {
       ~~~~~~

src/utils/tsc.ts:32:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

32     result = await runCommand('npx', [ '--no-install', 'tsc', ...tscArgs ], {
       ~~~~~~

Found 3 errors in 2 files.

Errors  Files
     1  src/utils/extractFunction.ts:375
     2  src/utils/tsc.ts:27
error Command failed with exit code 2.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.`

const sampleSameFileTscOutput = `$ E:\\Projects\\Seraphim\\node_modules\\.bin\\tsc
src/utils/tsc.ts:27:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

27     result = await runCommand('yarn', [ 'tsc', ...tscArgs ], {
       ~~~~~~

src/utils/tsc.ts:32:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

32     result = await runCommand('npx', [ '--no-install', 'tsc', ...tscArgs ], {
       ~~~~~~

Found 2 errors in the same file, starting at: src/utils/tsc.ts:27

error Command failed with exit code 2.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.`

const sampleNoErrorsTscOutput = `$ E:\\Projects\\Seraphim\\node_modules\\.bin\\tsc
Done in 1.03s.`

describe('filterTscErrorsToJustFile', () => {
  it('filters to only the target file when errors span multiple files', () => {
    const targetFile = path.resolve(process.cwd(), 'src/utils/tsc.ts')
    const result = filterTscErrorsToJustFile(sampleMultiFileTscOutput, targetFile)

    const expected = `src/utils/tsc.ts:27:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

27     result = await runCommand('yarn', [ 'tsc', ...tscArgs ], {
       ~~~~~~

src/utils/tsc.ts:32:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

32     result = await runCommand('npx', [ '--no-install', 'tsc', ...tscArgs ], {
       ~~~~~~`

    expect(result.trim()).toBe(expected.trim())
  })

  it('handles multiple errors in the same file and ignores the summary', () => {
    const targetFile = path.resolve(process.cwd(), 'src/utils/tsc.ts')
    const result = filterTscErrorsToJustFile(sampleSameFileTscOutput, targetFile)

    const expected = `src/utils/tsc.ts:27:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

27     result = await runCommand('yarn', [ 'tsc', ...tscArgs ], {
       ~~~~~~

src/utils/tsc.ts:32:5 - error TS2322: Type '[string, number, string]' is not assignable to type 'Promise<[string, number, string]>'. 

32     result = await runCommand('npx', [ '--no-install', 'tsc', ...tscArgs ], {
       ~~~~~~`

    expect(result.trim()).toBe(expected.trim())
  })

  it('returns an empty string when there are no errors', () => {
    const targetFile = path.resolve(process.cwd(), 'src/utils/tsc.ts')
    const result = filterTscErrorsToJustFile(sampleNoErrorsTscOutput, targetFile)

    expect(result).toBe('')
  })
})
