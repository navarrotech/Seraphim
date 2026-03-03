// Copyright © 2026 Jalapeno Labs

import type { LlmWithRateLimits } from '@common/types'

export type ViewProps = {
  isFirst?: boolean
  existingLLM?: LlmWithRateLimits
  close?: () => void
}
