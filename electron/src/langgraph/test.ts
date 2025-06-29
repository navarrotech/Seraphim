// Copyright © 2025 Jalapeno Labs

import { StateGraph, Annotation } from '@langchain/langgraph'
import { tool } from '@langchain/core/tools'
import fs from 'fs/promises'
import { z } from 'zod'
import { getLanggraphLLM } from './llm' // your dynamic LLM factory
import { getVscodeUserSelection } from './vscode' // your VSCode helper

// 1. Grab selection
const getSelectionTool = tool(async () => {
  const { text, filePath } = await getVscodeUserSelection()
  return { functionText: text, filePath }
}, {
  name: 'getSelection',
  description: 'Grab the selected function text and its file path',
  schema: z.object({})
})

// 2. Write JSDoc back
const writeJsdocTool = tool(async (args: { filePath: string, jsdoc: string }) => {
  const original = await fs.readFile(args.filePath, 'utf-8')
  const updated = args.jsdoc + '\n' + original
  await fs.writeFile(args.filePath, updated, 'utf-8')
  return { success: true }
}, {
  name: 'writeJsdoc',
  description: 'Prepend JSDoc comments to the selected file',
  schema: z.object({
    filePath: z.string(),
    jsdoc: z.string()
  })
})

// 3. State schema
const JsdocState = Annotation.Root({
  functionText: Annotation<string>,
  filePath: Annotation<string>,
  jsdoc: Annotation<string>
})

// 4. Build and compile the graph
jsdocGraph.invoke({

}, { signal })
