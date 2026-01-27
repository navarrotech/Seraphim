// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect, useMemo, useState } from 'react'

// Utility
import { debounce } from 'lodash-es'

export function useDebouncedState<Shape>(value: Shape, delayMs: number): Shape {
  const [ debouncedValue, setDebouncedValue ] = useState(value)

  const debouncedSetter = useMemo(
    () => debounce((nextValue: Shape) => {
        setDebouncedValue(nextValue)
      }, delayMs),
    [ delayMs ],
  )

  useEffect(() => {
    if (delayMs <= 0) {
      console.debug('useDebouncedState received non-positive delay', { delayMs })
      setDebouncedValue(value)
      return () => {}
    }

    debouncedSetter(value)

    return () => {
      debouncedSetter.cancel()
    }
  }, [ value, delayMs, debouncedSetter ])

  return debouncedValue
}
