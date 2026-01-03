// Copyright © 2026 Jalapeno Labs

// import testing utilities from vitest
import { describe, it, expect } from 'vitest'

// import the function under test
import { getSelection } from './getSelection'

describe('getSelection', () => {
  // simple case: single-line selection
  it('should find a selection on a single line', () => {
    const fullText = 'line1\nline2\nline3'
    const selection = 'line2'
    const result = getSelection(fullText, selection)
    expect(result).toEqual({ startLine: 1, endLine: 1, text: selection })
  })

  // multi-line selection case
  it('should find a selection spanning multiple lines', () => {
    const fullText = 'foo\nbar\nbaz\nqux'
    const selection = 'bar\nbaz'
    const result = getSelection(fullText, selection)
    expect(result).toEqual({ startLine: 1, endLine: 2, text: selection })
  })

  // CRLF normalization case
  it('should handle CRLF line endings', () => {
    const fullText = 'a\r\nb\r\nc'
    const selection = 'b'
    const result = getSelection(fullText, selection)
    expect(result).toEqual({ startLine: 1, endLine: 1, text: selection })
  })

  // multiple occurrences: picks the first one
  it('should pick the first occurrence if selection appears multiple times', () => {
    const fullText = 'foo\nbar\nfoo\nbar'
    const selection = 'foo'
    const result = getSelection(fullText, selection)
    expect(result).toEqual({ startLine: 0, endLine: 0, text: selection })
  })

  // error case: selection not found
  it('should throw an error if selection is not found', () => {
    const fullText = 'hello world'
    const selection = 'foo'
    expect(() => getSelection(fullText, selection)).toThrowError(
      'Selection was not found in the full text.',
    )
  })

  it('should expand partial selections to full lines', () => {
    const fullText = 'line 1\nline 2\nline 3'
    const selection = '2\nline'
    const result = getSelection(fullText, selection)
    expect(result).toEqual({
      startLine: 1,
      endLine: 2,
      text: 'line 2\nline 3',
    })
  })
})
