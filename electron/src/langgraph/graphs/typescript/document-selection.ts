// Copyright © 2025 Jalapeno Labs

import { StateGraph } from '@langchain/langgraph'
// import { tool } from '@langchain/core/tools'
// import fs from 'fs/promises'
// import { z } from 'zod'

export const tsDocumentSelection = new StateGraph(JsdocState)
  // .addNode('getSelection', getSelectionTool)
  // .addNode('generateJsdoc', async (state) => {
  //   const prompt = `Generate detailed JSDoc for this function:\n\n${state.functionText}`
  //   const llm = getLanggraphLLM(/* config */)
  //   const res = await llm.call([{ role: 'user', content: prompt }])
  //   return { jsdoc: res.choices?.[0].message.content ?? '' }
  // })
  // .addNode('writeJsdoc', writeJsdocTool)
  // .addEdge('getSelection', 'generateJsdoc')
  // .addEdge('generateJsdoc', 'writeJsdoc')
  .compile()
