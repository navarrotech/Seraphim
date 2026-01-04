// Copyright © 2026 Jalapeno Labs

// Core
import { Textarea } from '@heroui/react'
import { Toolbar } from './Toolbar'

export function Terminal() {
  return <>
    <Toolbar />
    <section className='full-canvas'>
      <Textarea
        aria-label='full-canvas-textarea'
        className='full-canvas-textarea'
        placeholder='Start typing...'
      />
    </section>
  </>
}
