// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'

export const workspaceIdSchema = z.string().trim().min(1)
export const userIdSchema = z.string().trim().min(1)
