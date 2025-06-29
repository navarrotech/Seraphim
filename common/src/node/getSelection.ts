// Copyright © 2025 Jalapeno Labs

// shape of what we return
type SelectionAtPosition = {
  startLine: number
  endLine: number
  text: string
}

// helper to count how many times a regex matches
function countMatches(haystack: string, needle: RegExp) {
  let count = 0
  let match: RegExpExecArray | null
  // reset lastIndex in case the regex is stateful
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

// find the zero‐based start/end lines of `selection` inside `fullText`
export function getSelection(
  fullText: string,
  selection: string
): SelectionAtPosition {
  // normalize all CRLFs to LFs so indexing stays consistent
  const normalized = fullText.replace(/\r\n/g, '\n')
  const selectionNormalized = selection.replace(/\r\n/g, '\n')

  // find it in the normalized text
  const startIndex = normalized.indexOf(selectionNormalized)
  if (startIndex === -1) {
    throw new Error('Selection was not found in the full text.')
  }

  // how many line breaks before the selection? that’s startLine
  const startLine = countMatches(normalized.slice(0, startIndex), /\n/g)

  // how many lines does the selection itself span?
  const lineCountInSelection = countMatches(selectionNormalized, /\n/g) + 1

  // endLine is startLine plus that span minus one
  const endLine = startLine + lineCountInSelection - 1

  return {
    startLine,
    endLine,
    text: selection
  }
}
