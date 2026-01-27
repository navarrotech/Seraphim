// Copyright © 2026 Jalapeno Labs

import type { OAuthState, PrismaClient } from '@prisma/client'
import type { OAuthProvider } from './oauthTypes'

// Core
import { randomUUID } from 'crypto'

// Misc
import { DEFAULT_OAUTH_STATE_TTL_MINUTES } from '@electron/constants'

export type OAuthStateCreateInput = {
  provider: OAuthProvider
  callbackUrl: string
  completionRedirectUrl: string | null
  scopes: string[]
}

function getStateExpirationDate(): Date {
  return new Date(Date.now() + DEFAULT_OAUTH_STATE_TTL_MINUTES * 60_000)
}

export async function cleanupExpiredOAuthStates(databaseClient: PrismaClient): Promise<void> {
  try {
    await databaseClient.oAuthState.deleteMany({
      where: { expiresAt: { lte: new Date() }},
    })
  }
  catch (error) {
    console.debug('Failed to cleanup expired OAuth states', error)
  }
}

export async function createOAuthStateRecord(
  databaseClient: PrismaClient,
  input: OAuthStateCreateInput,
): Promise<OAuthState | null> {
  await cleanupExpiredOAuthStates(databaseClient)

  const state = randomUUID()
  const expiresAt = getStateExpirationDate()

  try {
    return await databaseClient.oAuthState.create({
      data: {
        provider: input.provider,
        state,
        callbackUrl: input.callbackUrl,
        completionRedirectUrl: input.completionRedirectUrl,
        scopes: input.scopes,
        expiresAt,
      },
    })
  }
  catch (error) {
    console.error('Failed to create OAuth state record', error)
    return null
  }
}

export async function consumeOAuthStateRecord(
  databaseClient: PrismaClient,
  state: string,
): Promise<OAuthState | null> {
  try {
    const stateRecord = await databaseClient.oAuthState.findUnique({
      where: { state },
    })

    if (!stateRecord) {
      console.debug('OAuth state not found', { state })
      return null
    }

    if (stateRecord.expiresAt.getTime() <= Date.now()) {
      console.debug('OAuth state expired', { state, expiresAt: stateRecord.expiresAt })
      await databaseClient.oAuthState.delete({
        where: { state },
      })
      return null
    }

    await databaseClient.oAuthState.delete({
      where: { state },
    })

    return stateRecord
  }
  catch (error) {
    console.error('Failed to consume OAuth state record', error)
    return null
  }
}
