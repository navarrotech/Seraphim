// Copyright © 2026 Jalapeno Labs

// Lib
import { z } from 'zod'

// Misc
import {
  DONE_SOUND_MIME_TYPES,
  USER_LANGUAGE_OPTIONS,
  USER_THEME_OPTIONS,
} from '../constants'

export const userLanguageSchema = z.enum(USER_LANGUAGE_OPTIONS)
export const userThemeSchema = z.enum(USER_THEME_OPTIONS)

export const userSettingsSchema = z
  .object({
    language: userLanguageSchema,
    theme: userThemeSchema,
    codeEditor: z.string().trim().optional(),
    voiceEnabled: z.boolean(),
    voiceHotkey: z.string().trim().min(1),
    doneSoundAudioFileId: z.string().uuid().nullable().optional(),
    customAgentInstructions: z.string().optional().default(''),
    customAgentsFile: z.string().nullable().optional(),
  })
  .strict()
export type UserSettingsRequest = z.infer<typeof userSettingsSchema>

const doneSoundFileSchema = z.
  object({
    name: z.string().trim().min(1),
    mimeType: z.enum(DONE_SOUND_MIME_TYPES),
    sizeBytes: z.number().int().positive(),
    dataBase64: z.string().trim().min(1),
  })
  .strict()

export const userSettingsUpdateFieldsSchema = z
  .object({
    language: userLanguageSchema.optional(),
    theme: userThemeSchema.optional(),
    codeEditor: z.string().trim().optional(),
    voiceEnabled: z.boolean().optional(),
    voiceHotkey: z.string().trim().min(1).optional(),
    customAgentInstructions: z.string().optional(),
    customAgentsFile: z.string().nullable().optional(),
  })

export const userSettingsUpdateSchema = userSettingsUpdateFieldsSchema
  .extend({
    doneSoundFile: doneSoundFileSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No valid fields provided for update' },
  )

export type UserSettingsUpdateRequest = z.infer<typeof userSettingsUpdateSchema>
