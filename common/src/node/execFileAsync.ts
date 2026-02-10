// Copyright © 2026 Jalapeno Labs

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const execFileAsync = promisify(execFile)
