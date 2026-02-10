// Copyright © 2026 Jalapeno Labs

// Core
import { CallableLLM } from './callLlm'
import { Codex } from '@openai/codex-sdk'

// Node.js
import { tmpdir } from 'node:os'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// Misc
import { Timer } from '@common/timer'

export class CallableCodex extends CallableLLM {
  public async query(prompt: string, systemPrompt?: string): Promise<string> {
    const timer = new Timer('OpenAI query')
    let contextDirectory: string | undefined = undefined

    try {
      contextDirectory = await mkdtemp(
        resolve(tmpdir(), 'seraphim-codex-'),
      )

      // In our database, we save the "auth.json" file as a string under the apiKey attribute
      await Promise.all([
        writeFile(
          resolve(contextDirectory, 'auth.json'),
          this.llm.apiKey,
          'utf-8',
        ),
        writeFile(
          resolve(contextDirectory, 'config.toml'),
          `cli_auth_credentials_store = "file"\n`,
          'utf-8',
        ),
      ])

      const client = new Codex({
        env: {
          CODEX_HOME: contextDirectory,
        },
      })

      let normalizedPrompt = ''
      if (systemPrompt) {
        normalizedPrompt += 'System prompt:\n' + systemPrompt.trim() + '\n\nUser prompt:\n'
      }
      normalizedPrompt += (prompt?.trim() || '')

      if (!normalizedPrompt) {
        console.debug('Codex query was empty after normalization')
        return 'Unnamed task'
      }

      console.debug('Sending query to Codex', { prompt: normalizedPrompt, systemPrompt })

      const thread = client.startThread()
      const result = await thread.run(normalizedPrompt)

      console.debug('Codex response', { response: result.finalResponse })

      return result.finalResponse
    }
    catch (error) {
      console.error('Error during Codex query', error)
    }
    finally {
      if (contextDirectory) {
        await rm(contextDirectory, { recursive: true, force: true })
      }

      timer.stop()
    }

    return 'Unnamed task'
  }
}
