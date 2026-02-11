// Copyright © 2026 Jalapeno Labs

import type { TaskWithFullContext } from './types'

// Misc
import { DOCKER_WORKDIR } from './constants'

export function createCodexConfig(
  task: TaskWithFullContext,
) {
  const config = `
# Written by Alex Navarro

model = "${task.llm.preferredModel || 'gpt-5.2-codex'}"

approval_policy = "never"
sandbox_mode = "danger-full-access"
model_reasoning_effort = "medium"

windows_wsl_setup_acknowledged = true
check_for_update_on_startup = false

[projects."${DOCKER_WORKDIR}"]
trust_level = "trusted"

[notice]
hide_full_access_warning = true

[notice.model_migrations]
"gpt-5.1" = "gpt-5.2-codex"
  `.trim()

  return config
}

export function createCodexAuthFile(
  task: TaskWithFullContext,
) {
  if (task.llm.type === 'OPENAI_API_KEY') {
    return JSON.stringify({
      OPENAI_API_KEY: task.llm.apiKey,
    })
  }
  else if (task.llm.type === 'OPENAI_LOGIN_TOKEN') {
    return task.llm.accessToken
  }
  else {
    throw new Error(`Unsupported LLM type: ${task.llm.type}`)
  }
}
