// Copyright © 2026 Jalapeno Labs

// Core
import { ConfirmContext } from '@frontend/gates/ConfirmGate'
import { useContext } from 'react'

export function useConfirm() {
  return useContext(ConfirmContext)
}
