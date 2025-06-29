// Copyright © 2025 Jalapeno Labs

import type { CompiledStateGraph } from '@langchain/langgraph'

// Core
import { join, resolve } from 'path'
import { writeFileSync } from 'fs'

type AnyCompiledStateGraph = CompiledStateGraph<any, any>

const graphs: AnyCompiledStateGraph[] = []

// This is a script not a module. Usage:
// tsx electron/src/langgraph/drawGraphs.ts

const OUT = process.cwd()

async function drawGraphs() {
  for (const graph of graphs) {
    await draw(graph)
  }
  console.log(`Finished writing ${graphs.length} workflow graphs to disk.`)
}

async function draw(graph: AnyCompiledStateGraph) {
  const graphName = graph.getName()
  const blob = await graph.getGraph().drawMermaidPng({
    backgroundColor: 'white',
    curveStyle: 'linear'
    // nodeColors, withStyles, wrapLabelNWords…
  })

  const outputPath = resolve(
    join(
      OUT,
      `${graphName}.png`
    )
  )

  const arrayBuf = await blob.arrayBuffer()
  const buf = Buffer.from(arrayBuf)
  writeFileSync(outputPath, buf)

  console.log(`Wrote graph ${graphName} to ${outputPath}`)
}

drawGraphs()
