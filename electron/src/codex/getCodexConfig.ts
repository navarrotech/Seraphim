// Copyright © 2026 Jalapeno Labs

import type { Llm } from '@prisma/client'

type CodexConfigFiles = {
  'config.toml': string
  'auth.json': string | null
}

type CodexConfig = {
  files: CodexConfigFiles
  environment: Record<string, string>
}

type ResolvedLlm = {
  model: string
  authJson: string | null
  environment: Record<string, string>
  modelProvider: string
  providerLines: string[]
}

export function getCodexConfig(llm: Llm): CodexConfig | null {
  const resolved = resolveLlmAuth(llm)
  if (!resolved) {
    console.debug('Codex config could not resolve llm', {
      llmId: llm.id,
      llmType: llm.type,
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

function resolveLlmAuth(llm: Llm): ResolvedLlm | null {
  const model = llm.preferredModel?.trim()
  if (!model) {
    console.debug('Codex config missing preferred model on llm', {
      llmId: llm.id,
      llmType: llm.type,
    })
    return null
  }

  if (llm.type === 'OPENAI_API_KEY') {
    const apiKey = llm.apiKey?.trim()
    if (!apiKey) {
      console.debug('Codex config missing OpenAI API key', {
        llmId: llm.id,
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

  if (llm.type === 'OPENAI_LOGIN_TOKEN') {
    const accessToken = llm.accessToken?.trim()
    if (!accessToken) {
      console.debug('Codex config missing OpenAI access token', {
        llmId: llm.id,
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

  if (llm.type === 'KIMI_API_KEY') {
    const apiKey = llm.apiKey?.trim()
    if (!apiKey) {
      console.debug('Codex config missing Kimi API key', {
        llmId: llm.id,
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

  console.debug('Codex config does not support llm type yet', {
    llmId: llm.id,
    llmType: llm.type,
  })
  return null
}

function buildConfigToml(config: ResolvedLlm): string {
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
