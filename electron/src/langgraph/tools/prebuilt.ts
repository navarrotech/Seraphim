// Copyright © 2026 Jalapeno Labs

import type { ToolFactory } from '../types'
import type { DynamicStructuredTool } from '@langchain/core/tools'

// Tools:
import { WebBrowser } from 'langchain/tools/webbrowser'
import { Calculator } from '@langchain/community/tools/calculator'

// Prebuilt:
// https://js.langchain.com/docs/integrations/tools/

// Community tools:
// https://www.npmjs.com/package/@langchain/community
// https://github.com/langchain-ai/langchainjs/tree/main/examples/src/document_loaders

type AvailableTools =
  | 'web-search'
  | 'calculator'

// TODO: Fix these types:
export function getPrebuiltTool(toolname: AvailableTools): ToolFactory {
  switch (toolname) {
  case 'web-search':
    // https://js.langchain.com/docs/integrations/tools/webbrowser/
    return (snapshot, llm, embeddings) => new WebBrowser({
      model: llm,
      embeddings,
    }) as any as DynamicStructuredTool
  case 'calculator':
    // https://v03.api.js.langchain.com/classes/_langchain_community.tools_calculator.Calculator.html
    return () => new Calculator() as any as DynamicStructuredTool
  default:
    throw new Error(`Unknown tool: ${toolname}`)
  }
}
