// Copyright © 2026 Jalapeno Labs

// Core
import { createHash } from 'crypto'

/**
 * Generate a SHA-256 digest by streaming text in chunks
 *
 * @param {string} text – the full text to hash
 * @return {string} a Promise resolving to a hex-encoded SHA-256 digest
 */
export function createHashForText(text: string): string {
  const hash = createHash('sha256')

  // split into, say, 1 MB chunks to keep memory bounded
  const CHUNK_SIZE = 1024 * 1024
  for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
    const chunk = text.slice(offset, offset + CHUNK_SIZE)
    hash.update(chunk, 'utf8')
  }

  return hash.digest('hex')
}
