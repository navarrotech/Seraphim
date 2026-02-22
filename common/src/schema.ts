// Copyright © 2026 Jalapeno Labs

import { z } from 'zod'

// Misc
import {
  DONE_SOUND_MIME_TYPES,
  USER_LANGUAGE_OPTIONS,
  USER_THEME_OPTIONS,
} from './constants'

export const environmentSchema = z.object({
  key: z
    .string()
    .max(256),
  value: z
    .string()
    .max(2048),
})

export type Environment = z.infer<typeof environmentSchema>

export const taskCreateSchema = z.object({
  userId: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
  authAccountId: z.string().trim().min(1),
  llmId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  branch: z.string().trim().min(1),
  issueLink: z.string().optional(),
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

export const userLanguageSchema = z.enum(USER_LANGUAGE_OPTIONS)
export const userThemeSchema = z.enum(USER_THEME_OPTIONS)

export const userSettingsSchema = z.object({
  language: userLanguageSchema,
  theme: userThemeSchema,
  codeEditor: z.string().trim().optional(),
  voiceEnabled: z.boolean(),
  voiceHotkey: z.string().trim().min(1),
  doneSoundAudioFileId: z.string().uuid().nullable().optional(),
  customAgentInstructions: z.string().optional().default(''),
  customAgentsFile: z.string().nullable().optional(),
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
  codeEditor: z.string().trim().optional(),
  voiceEnabled: z.boolean().optional(),
  voiceHotkey: z.string().trim().min(1).optional(),
  customAgentInstructions: z.string().optional(),
  customAgentsFile: z.string().nullable().optional(),
}).strict()

export const userSettingsUpdateSchema = userSettingsUpdateFieldsSchema.extend({
  doneSoundFile: doneSoundFileSchema.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update',
})

export type TaskCreateRequest = z.infer<typeof taskCreateSchema>
export type TaskUpdateRequest = z.infer<typeof taskUpdateSchema>
export type UserSettingsRequest = z.infer<typeof userSettingsSchema>
export type UserSettingsUpdateRequest = z.infer<typeof userSettingsUpdateSchema>
