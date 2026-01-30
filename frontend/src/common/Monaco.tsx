// Copyright © 2026 Jalapeno Labs

import type { OnChange } from '@monaco-editor/react'
import type { MonacoFileLanguages } from '@frontend/framework/monaco'

// Misc
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
      onMount={(editor) => {
        if (props.autoFocus) {
          editor.focus()
        }
      }}
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
