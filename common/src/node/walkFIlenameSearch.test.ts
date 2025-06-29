// Copyright © 2025 Jalapeno Labs

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { walkFilenameSearch } from './walkFilenameSearch'

describe('walkFilenameSearch', () => {
  // baseDir will hold our temp workspace
  let baseDir: string

  beforeAll(() => {
    // make a unique temp dir
    baseDir = mkdtempSync(join(tmpdir(), 'wfs-test-'))

    // top-level files
    writeFileSync(join(baseDir, 'file1.txt'), 'hello')
    writeFileSync(join(baseDir, 'file2.js'), 'console.log')
    writeFileSync(join(baseDir, '.env'), 'SECRET=abc')

    // nested subdir with a .txt file
    mkdirSync(join(baseDir, 'subdir'))
    writeFileSync(join(baseDir, 'subdir', 'file3.txt'), 'world')

    // a directory we’ll exclude
    mkdirSync(join(baseDir, 'excludeDir'))
    writeFileSync(join(baseDir, 'excludeDir', 'file4.txt'), 'should be excluded')
  })

  afterAll(() => {
    // clean up the entire temp tree
    rmSync(baseDir, { recursive: true, force: true })
  })

  it('finds all .txt files by default', async () => {
    const results = await walkFilenameSearch(baseDir, '\\.txt$')

    // should include file1.txt and subdir/file3.txt
    expect(results).toContain('file1.txt')
    expect(results).toContain(join('subdir', 'file3.txt'))

    // should not include .js or forbidden files
    expect(results).not.toContain('file2.js')
    expect(results).not.toContain('.env')
  })

  it('respects the exclude list', async () => {
    // exclude the folder we created above
    const results = await walkFilenameSearch(
      baseDir,
      '\\.txt$',
      [ 'excludeDir' ]
    )

    // file4.txt lives under excludeDir, so it should be skipped
    expect(results).not.toContain(join('excludeDir', 'file4.txt'))
  })

  it('skips forbiddenFiles entries', async () => {
    // forbid file2.js explicitly
    const results = await walkFilenameSearch(
      baseDir,
      'file2\\.js$',
      [], // no extra excludes
      [ 'file2.js' ] // forbid file2.js
    )

    // even though the pattern matches, it’s forbidden
    expect(results).not.toContain('file2.js')
  })
})
