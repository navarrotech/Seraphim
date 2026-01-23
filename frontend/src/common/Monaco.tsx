// Copyright © 2026 Jalapeno Labs

import type { OnMount, OnChange } from '@monaco-editor/react'
import type { MonacoFileLanguages } from '@frontend/framework/monaco'

// Core
import { useCallback, useEffect } from 'react'

// Misc
import { initMonaco } from '@frontend/framework/monaco'
import Editor from '@monaco-editor/react'

export type MonacoRequiredProps = {
  value: string
  onChange: OnChange
  height: string
  fileLanguage?: MonacoFileLanguages
}

export type MonacoOptionalProps = {
  autoFocus?: boolean
  minimapOverride?: boolean
  readOnly?: boolean
}

export type MonacoProps = MonacoRequiredProps & MonacoOptionalProps

export function Monaco(props: MonacoProps) {
  useEffect(function ensureMonacoReady() {
    void initMonaco()
  }, [])

  const handleMount: OnMount = useCallback((editor) => {
    if (props.autoFocus) {
      editor.focus()
    }
  }, [])

  return <div className={props.readOnly ? 'opacity-70' : ''}>
    <Editor
      height={props.height}
      language={props.fileLanguage}
      value={props.value}
      onChange={!props.readOnly
        ? props.onChange
        : undefined
      }
      loading={<></>}
      onMount={handleMount}
      options={{
        automaticLayout: true,
        minimap: {
          enabled: props.minimapOverride,
        },
        scrollBeyondLastLine: true,
        readOnly: props.readOnly ?? false,
      }}
    />
  </div>
}
