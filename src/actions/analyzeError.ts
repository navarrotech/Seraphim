// Copyright © 2025 Jalapeno Labs

import type { ActionContext } from '../types'

// Core
import { assembleErrorReport } from '@/prompts/assembleErrorReport'
import { applyConflictBarriers } from '@/prompts/applyConflictBarriers'

// Lib
import { Timer } from '@/utils/timer'

export async function analyzeError(context: ActionContext): Promise<void> {
  const analyzeTimer = new Timer('AnalyzeError')
  const errorReport = await assembleErrorReport(context)
  analyzeTimer.stop()

  if (!errorReport) {
    console.error('Failed to generate error report')
    return
  }

  console.log('Error report generated successfully')
  console.log(errorReport)

  const conflictBarriersTimer = new Timer('ApplyConflictBarriers')
  const promises: Promise<boolean>[] = []
  for (const fix of errorReport) {
    promises.push(
      applyConflictBarriers(fix)
    )
  }

  await Promise.all(promises)
  conflictBarriersTimer.stop()
}
