// Copyright © 2025 Jalapeno Labs

// Core
import { getProjectConfig } from './utility/getProjectConfig'
import { getLanggraphLLM } from './langgraph'

export async function getProjectAndLLM() {
  const [ projectConfig, rootPath ] = getProjectConfig()
  const llm = await getLanggraphLLM(projectConfig)
  return [
    llm,
    projectConfig,
    rootPath
  ]
}
