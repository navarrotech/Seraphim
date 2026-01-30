// Copyright © 2026 Jalapeno Labs

import type { Connection } from '@prisma/client'

type CodexConfigFiles = {
  'config.toml': string
  'auth.json': string | null
}

type CodexConfig = {
  files: CodexConfigFiles
  environment: Record<string, string>
}

type ResolvedConnection = {
  model: string
  authJson: string | null
  environment: Record<string, string>
  modelProvider: string
  providerLines: string[]
}

export function getCodexConfig(connection: Connection): CodexConfig | null {
  const resolved = resolveConnectionAuth(connection)
  if (!resolved) {
    console.debug('Codex config could not resolve connection', {
      connectionId: connection.id,
      connectionType: connection.type,
    })
    return null
  }

  const configToml = buildConfigToml(resolved)
  return {
    files: {
      'config.toml': configToml,
      'auth.json': resolved.authJson,
    },
    environment: resolved.environment,
  }
}

function resolveConnectionAuth(connection: Connection): ResolvedConnection | null {
  const model = connection.preferredModel?.trim()
  if (!model) {
    console.debug('Codex config missing preferred model on connection', {
      connectionId: connection.id,
      connectionType: connection.type,
    })
    return null
  }

  if (connection.type === 'OPENAI_API_KEY') {
    const apiKey = connection.apiKey?.trim()
    if (!apiKey) {
      console.debug('Codex config missing OpenAI API key', {
        connectionId: connection.id,
      })
      return null
    }

    return {
      model,
      modelProvider: 'openai',
      authJson: JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2),
      environment: {},
      providerLines: [],
    }
  }

  if (connection.type === 'OPENAI_LOGIN_TOKEN') {
    const accessToken = connection.accessToken?.trim()
    if (!accessToken) {
      console.debug('Codex config missing OpenAI access token', {
        connectionId: connection.id,
      })
      return null
    }

    return {
      model,
      modelProvider: 'openai',
      authJson: JSON.stringify({ OPENAI_ACCESS_TOKEN: accessToken }, null, 2),
      environment: {},
      providerLines: [],
    }
  }

  if (connection.type === 'KIMI_API_KEY') {
    const apiKey = connection.apiKey?.trim()
    if (!apiKey) {
      console.debug('Codex config missing Kimi API key', {
        connectionId: connection.id,
      })
      return null
    }

    return {
      model,
      modelProvider: 'kimi',
      authJson: null,
      environment: {
        KIMI_API_KEY: apiKey,
      },
      providerLines: [
        '[model_providers.kimi]',
        'name = "Kimi"',
        'base_url = "https://api.moonshot.cn/v1"',
        'env_key = "KIMI_API_KEY"',
        'wire_api = "responses"',
      ],
    }
  }

  console.debug('Codex config does not support connection type yet', {
    connectionId: connection.id,
    connectionType: connection.type,
  })
  return null
}

function buildConfigToml(config: ResolvedConnection): string {
  const lines = [
    `model = "${config.model}"`,
    `model_provider = "${config.modelProvider}"`,
    'cli_auth_credentials_store = "file"',
  ]

  if (config.providerLines.length > 0) {
    lines.push('', ...config.providerLines)
  }

  return `${lines.join('\n')}\n`
}
