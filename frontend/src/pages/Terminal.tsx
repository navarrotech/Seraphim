// Copyright © 2026 Jalapeno Labs

// Core
import { Textarea } from '@heroui/react'

export function Terminal() {
  return <div className='full-canvas'>
    <Textarea
      aria-label='full-canvas-textarea'
      className='full-canvas-textarea'
      placeholder='Start typing...'
    />
  </div>
}
