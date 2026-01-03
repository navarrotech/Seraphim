// Copyright © 2026 Jalapeno Labs

import { readFile } from 'fs/promises'

export async function readFileSafe(
  filePath: string,
  encoding: BufferEncoding = 'utf-8',
): Promise<string | null> {
  try {
    return await readFile(filePath, { encoding })
  }
  catch (error) {
    console.error(`Failed to read file ${filePath}:`, error)
    return null
  }
}
