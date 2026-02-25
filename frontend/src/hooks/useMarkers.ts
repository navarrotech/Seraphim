// Copyright © 2026 Jalapeno Labs

import type { MonacoContext, Marker } from '@frontend/framework/monaco'

// Core
import { useState, useEffect } from 'react'
import { debounce, isEqual } from 'lodash-es'

// Misc
import { MarkerSeverity } from 'monaco-editor'

export function useMonacoMarkers(
  owner: string,
  getMarkers: (content: string, severity: typeof MarkerSeverity) => Marker[],
) {
  const [ markers, setMarkers ] = useState<Marker[]>([])
  const [ context, setContext ] = useState<MonacoContext | null>(null)

  useEffect(() => {
    if (!context?.editor || !context?.monaco || !getMarkers) {
      return () => {}
    }

    const model = context.editor.getModel()
    if (!model) {
      console.debug('Unable to set Monaco markers: No model found for the Monaco editor')
      return () => {}
    }

    let lastMarkers: Marker[] = []
    function updateMarkers() {
      const monacoValue = model.getValue()

      const markers = getMarkers(monacoValue, MarkerSeverity)

      // Only re-render if it's actually changed:
      if (isEqual(lastMarkers, markers)) {
        return
      }

      lastMarkers = markers

      context.monaco.editor.setModelMarkers(
        model,
        owner,
        markers,
      )

      setMarkers(markers)
    }

    // We debounce it, so the typing isn't super laggy!
    // That way, if they're a decent typer, it won't trigger too often.
    const asDebounced = debounce(updateMarkers, 350)

    // On modal value changes...
    const disposable = model.onDidChangeContent(asDebounced)

    // Do it initially!
    updateMarkers()

    return () => {
      disposable.dispose()
    }
  },
  [ context ],
  )

  return {
    MarkerSeverity,
    markers,
    setContext,
  }
}
