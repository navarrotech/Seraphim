// Copyright © 2025 Jalapeno Labs
type SelectionAtPosition = {
  startLine: number
  endLine: number
  text: string
}

// helper to count newline matches
function countMatches(haystack: string, needle: RegExp) {
  let count = 0
  let match: RegExpExecArray | null
  needle.lastIndex = 0
  while ((match = needle.exec(haystack))) {
    count++
    // avoid infinite loop on zero‐length matches
    if (needle.lastIndex === match.index) {
      needle.lastIndex++
    }
  }
  return count
}

// get the zero‐based start/end lines, expanding to full lines
export function getSelection(
  fullText: string,
  selection: string
): SelectionAtPosition {
  // normalize CRLF to LF
  const normalizedFull = fullText.replace(/\r\n/g, '\n')
  const normalizedSelection = selection.replace(/\r\n/g, '\n')

  // find the selection start
  const startIndex = normalizedFull.indexOf(normalizedSelection)
  if (startIndex === -1) {
    throw new Error('Selection was not found in the full text.')
  }

  // expand backwards to start of containing line
  const startOfLineIndex
    = normalizedFull.lastIndexOf('\n', startIndex - 1) + 1

  // expand forwards to end of containing line
  const endSearchIndex = startIndex + normalizedSelection.length
  const nextNewline = normalizedFull.indexOf('\n', endSearchIndex)
  const endOfLineIndex
    = nextNewline !== -1 ? nextNewline : normalizedFull.length

  // pull out the full-line snippet
  const snippet = normalizedFull.slice(startOfLineIndex, endOfLineIndex)

  // compute zero-based line numbers
  const startLine = countMatches(
    normalizedFull.slice(0, startOfLineIndex),
    /\n/g
  )
  const endLine = countMatches(
    normalizedFull.slice(0, endOfLineIndex),
    /\n/g
  )

  return {
    startLine,
    endLine,
    text: snippet
  }
}
