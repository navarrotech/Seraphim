// Copyright © 2026 Jalapeno Labs

import { sep, normalize } from 'path'
import { realpath } from 'fs/promises'

export async function isSubPath(
  parentPath: string,
  childPath: string,
): Promise<boolean> {
  // resolve any symlinks, normalize, and make absolute
  const realParent = normalize(await realpath(parentPath))
  const realChild = normalize(await realpath(childPath))

  // if it's the exact same path, count it as inside
  if (realParent === realChild) {
    return true
  }

  // Normalize separators & trailing slash on parent
  // Incoming may be: '/foo/bar' or '/foo/bar/'
  // Normalize to: '/foo/bar/'
  // ensure parent path ends with a slash
  const parentWithSlash = realParent.endsWith(sep)
    ? realParent
    : realParent + sep

  // now a simple prefix check
  return realChild.startsWith(parentWithSlash)
}
