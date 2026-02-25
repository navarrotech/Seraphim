// Copyright © 2026 Jalapeno Labs

import type { Request, Response } from 'express'
import type { UserSettingsUpdateRequest } from '@common/schema/userSettings'

// Lib
import { AudioFor } from '@prisma/client'

// Utility
import { parseRequestBody } from '../../validation'
import { userSettingsUpdateSchema } from '@common/schema/userSettings'

// Misc
import { requireDatabaseClient } from '@electron/database'
import { broadcastSseChange } from '@electron/api/sse/sseEvents'
import { UserSettings } from '@common/types'

export type RequestBody = UserSettingsUpdateRequest

export async function handleUpdateUserSettingsRequest(
  request: Request<Record<string, never>, unknown, RequestBody>,
  response: Response,
): Promise<void> {
  const databaseClient = requireDatabaseClient('Update user settings API')

  const updateData = parseRequestBody(
    userSettingsUpdateSchema,
    request,
    response,
    {
      context: 'Update user settings API',
      errorMessage: 'Invalid request body',
    },
  )
  if (!updateData) {
    return
  }

  const { doneSoundFile, ...settingsUpdates } = updateData
  let doneSoundAudioBytes: Uint8Array<ArrayBuffer> | null = null
  if (doneSoundFile) {
    const decodedDoneSoundAudioBuffer = Buffer.from(doneSoundFile.dataBase64, 'base64')
    const decodedDoneSoundAudioBytes = new Uint8Array(
      new ArrayBuffer(decodedDoneSoundAudioBuffer.length),
    )
    decodedDoneSoundAudioBytes.set(decodedDoneSoundAudioBuffer)
    doneSoundAudioBytes = decodedDoneSoundAudioBytes
    if (doneSoundAudioBytes.length === 0) {
      console.debug('Done sound file was empty after decoding', {
        fileName: doneSoundFile.name,
        fileType: doneSoundFile.mimeType,
        fileSize: doneSoundFile.sizeBytes,
      })
      response.status(400).json({ error: 'Invalid done sound file provided' })
      return
    }
  }

  try {
    const user = await databaseClient.user.findFirst({
      orderBy: { createdAt: 'asc' },
    })

    if (!user) {
      console.debug('User settings update requested, but no users exist')
      response.status(404).json({ error: 'User not found' })
      return
    }

    const settings = await databaseClient.$transaction(async (transactionClient) => {
      const existingDoneSound = await transactionClient.audioFile.findFirst({
        where: {
          userId: user.id,
          audioFor: AudioFor.DONE_SOUND,
        },
      })

      let doneSoundAudioFileId: string | null | undefined = undefined

      if (doneSoundFile === null) {
        doneSoundAudioFileId = null
        if (existingDoneSound) {
          await transactionClient.audioFile.delete({
            where: {
              id: existingDoneSound.id,
            },
          })
        }
      }
      else if (doneSoundFile) {
        if (existingDoneSound) {
          await transactionClient.audioFile.delete({
            where: {
              id: existingDoneSound.id,
            },
          })
        }

        if (!doneSoundAudioBytes) {
          console.debug('Done sound buffer missing during settings update', {
            fileName: doneSoundFile.name,
            fileType: doneSoundFile.mimeType,
          })
          throw new Error('Done sound buffer was missing')
        }

        const newAudioFile = await transactionClient.audioFile.create({
          data: {
            userId: user.id,
            audioFor: AudioFor.DONE_SOUND,
            fileName: doneSoundFile.name,
            mimeType: doneSoundFile.mimeType,
            sizeBytes: doneSoundFile.sizeBytes,
            data: doneSoundAudioBytes,
          },
        })
        doneSoundAudioFileId = newAudioFile.id
      }

      const settingsUpdateData: Record<string, unknown> = { ...settingsUpdates }
      if (doneSoundAudioFileId !== undefined) {
        settingsUpdateData.doneSoundAudioFileId = doneSoundAudioFileId
      }

      return transactionClient.userSettings.upsert({
        where: { userId: user.id },
        update: settingsUpdateData,
        create: {
          user: {
            connect: {
              id: user.id,
            },
          },
          ...settingsUpdateData,
        },
      })
    }) as UserSettings

    broadcastSseChange({
      type: 'update',
      kind: 'settings',
      data: settings,
    })

    response.status(200).json({ settings })
  }
  catch (error) {
    console.error('Failed to update user settings', error)
    if (!response.headersSent) {
      response.status(500).json({ error: 'Failed to update user settings' })
    }
  }
}
