// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

// Misc
import {
  DONE_SOUND_MIME_TYPES,
  USER_LANGUAGE_OPTIONS,
  USER_THEME_OPTIONS,
} from './constants.js'

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
  authAccountId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  repositoryId: z.coerce.number().int().positive(),
  repositoryFullName: z.string().trim().min(1),
  customDockerfileCommands: z.string().trim().optional().default(''),
  description: z.string().trim().optional().default(''),
  setupScript: z.string().trim().optional().default(''),
  postScript: z.string().trim().optional().default(''),
  cacheFiles: z.array(z.string().trim()).optional().default([]),
  envEntries: z.array(workspaceEnvEntrySchema).optional().default([]),
}).strict()

export const workspaceUpdateSchema = z.object({
  authAccountId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  repositoryId: z.coerce.number().int().positive().optional(),
  repositoryFullName: z.string().trim().min(1).optional(),
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
  llmId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  branch: z.string().trim().min(1),
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

export const llmUpdateSchema = z.object({
  apiKey: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  preferredModel: z.string().trim().min(1).optional(),
  tokenLimit: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export const openAiApiKeyLlmCreateSchema = z.object({
  name: z.string().trim().min(1),
  preferredModel: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
  tokenLimit: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional().default(false),
}).strict()

export const openAiLoginTokenLlmCreateSchema = z.object({
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
  doneSoundAudioFileId: z.string().uuid().nullable().optional(),
}).strict()

const doneSoundFileSchema = z.object({
  name: z.string().trim().min(1),
  mimeType: z.enum(DONE_SOUND_MIME_TYPES),
  sizeBytes: z.number().int().positive(),
  dataBase64: z.string().trim().min(1),
}).strict()

const userSettingsUpdateFieldsSchema = z.object({
  language: userLanguageSchema.optional(),
  theme: userThemeSchema.optional(),
  voiceEnabled: z.boolean().optional(),
  voiceHotkey: z.string().trim().min(1).optional(),
}).strict()

export const userSettingsUpdateSchema = userSettingsUpdateFieldsSchema.extend({
  doneSoundFile: doneSoundFileSchema.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export type WorkspaceEnvEntry = z.infer<typeof workspaceEnvEntrySchema>
export type WorkspaceCreateRequest = z.infer<typeof workspaceCreateSchema>
export type WorkspaceUpdateRequest = z.infer<typeof workspaceUpdateSchema>
export type TaskCreateRequest = z.infer<typeof taskCreateSchema>
export type TaskUpdateRequest = z.infer<typeof taskUpdateSchema>
export type LlmUpdateRequest = z.infer<typeof llmUpdateSchema>
export type OpenAiApiKeyLlmCreateRequest = z.infer<
  typeof openAiApiKeyLlmCreateSchema
>
export type OpenAiLoginTokenLlmCreateRequest = z.infer<
  typeof openAiLoginTokenLlmCreateSchema
>
export type UserSettingsRequest = z.infer<typeof userSettingsSchema>
export type UserSettingsUpdateRequest = z.infer<typeof userSettingsUpdateSchema>
