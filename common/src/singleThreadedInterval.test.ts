// Copyright © 2026 Jalapeno Labs

import { describe, it, expect, vi } from 'vitest'
import { singleThreadedInterval } from './singleThreadedInterval'

describe('singleThreadedInterval', () => {
  it('drops overlapping ticks and runs serially', async () => {
    vi.useFakeTimers()
    let counter = 0

    const callback = vi.fn(async () => {
      counter += 1
      // simulate a long task
      await new Promise<void>((resolve) => setTimeout(resolve, 30))
    })

    const handle = singleThreadedInterval(callback, 10)

    await vi.advanceTimersByTimeAsync(100)
    clearInterval(handle)

    // Each run takes ~30ms, so about 3 executions should occur within 100ms
    expect(counter).toBeGreaterThanOrEqual(3)
    expect(counter).toBeLessThanOrEqual(4)
    // Ensure overlapping ticks were dropped
    expect(callback).toHaveBeenCalled()
  })
})
