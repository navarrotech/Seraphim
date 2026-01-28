// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

// Misc
import { USER_LANGUAGE_OPTIONS, USER_THEME_OPTIONS } from './constants.js'

export const environmentSchema = z.object({
  key: z
    .string()
    .max(256),
  value: z
    .string()
    .max(2048),
})

export type Environment = z.infer<typeof environmentSchema>

export const workspaceEnvEntrySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(256),
  value: z
    .string()
    .trim()
    .min(1)
    .max(2048),
})

export const workspaceCreateSchema = z.object({
  name: z.string().trim().min(1),
  repository: z.string().trim().min(1),
  containerImage: z.string().trim().min(1),
  customDockerfileCommands: z.string().trim().optional().default(''),
  description: z.string().trim().optional().default(''),
  setupScript: z.string().trim().optional().default(''),
  postScript: z.string().trim().optional().default(''),
  cacheFiles: z.array(z.string().trim()).optional().default([]),
  envEntries: z.array(workspaceEnvEntrySchema).optional().default([]),
}).strict()

export const workspaceUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  repository: z.string().trim().min(1).optional(),
  containerImage: z.string().trim().min(1).optional(),
  customDockerfileCommands: z.string().trim().optional(),
  description: z.string().trim().optional(),
  setupScript: z.string().trim().optional(),
  postScript: z.string().trim().optional(),
  cacheFiles: z.array(z.string().trim()).optional(),
  envEntries: z.array(workspaceEnvEntrySchema).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export const taskCreateSchema = z.object({
  userId: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  branch: z.string().trim().min(1),
  container: z.string().trim().min(1),
  archived: z.boolean().optional().default(false),
}).strict()

export const taskUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  branch: z.string().trim().min(1).optional(),
  container: z.string().trim().min(1).optional(),
  archived: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export const connectionUpdateSchema = z.object({
  apiKey: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  preferredModel: z.string().trim().min(1).optional(),
  tokenLimit: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export const openAiApiKeyConnectionCreateSchema = z.object({
  name: z.string().trim().min(1),
  preferredModel: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
  tokenLimit: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional().default(false),
}).strict()

export const kimiApiKeyConnectionCreateSchema = z.object({
  name: z.string().trim().min(1),
  preferredModel: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
  tokenLimit: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional().default(false),
}).strict()

export const openAiLoginTokenConnectionCreateSchema = z.object({
  name: z.string().trim().min(1),
  tokenLimit: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional().default(false),
}).strict()

export const userLanguageSchema = z.enum(USER_LANGUAGE_OPTIONS)
export const userThemeSchema = z.enum(USER_THEME_OPTIONS)

export const userSettingsSchema = z.object({
  language: userLanguageSchema,
  theme: userThemeSchema,
  voiceEnabled: z.boolean(),
  voiceHotkey: z.string().trim().min(1),
}).strict()

export const userSettingsUpdateSchema = userSettingsSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'No valid fields provided for update',
  },
)

export type WorkspaceEnvEntry = z.infer<typeof workspaceEnvEntrySchema>
export type WorkspaceCreateRequest = z.infer<typeof workspaceCreateSchema>
export type WorkspaceUpdateRequest = z.infer<typeof workspaceUpdateSchema>
export type TaskCreateRequest = z.infer<typeof taskCreateSchema>
export type TaskUpdateRequest = z.infer<typeof taskUpdateSchema>
export type ConnectionUpdateRequest = z.infer<typeof connectionUpdateSchema>
export type OpenAiApiKeyConnectionCreateRequest = z.infer<
  typeof openAiApiKeyConnectionCreateSchema
>
export type KimiApiKeyConnectionCreateRequest = z.infer<
  typeof kimiApiKeyConnectionCreateSchema
>
export type OpenAiLoginTokenConnectionCreateRequest = z.infer<
  typeof openAiLoginTokenConnectionCreateSchema
>
export type UserSettingsRequest = z.infer<typeof userSettingsSchema>
export type UserSettingsUpdateRequest = z.infer<typeof userSettingsUpdateSchema>
