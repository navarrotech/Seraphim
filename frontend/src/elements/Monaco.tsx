// Copyright © 2026 Jalapeno Labs

import type { OnChange } from '@monaco-editor/react'
import type { MonacoFileLanguages } from '@frontend/framework/monaco'

// Core
import Editor from '@monaco-editor/react'

// Theme
import { useSystemTheme } from '@frontend/hooks/useSystemTheme'
import { SERAPHIM_DARK_THEME, SERAPHIM_LIGHT_THEME } from '@frontend/framework/monaco'

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
  const theme = useSystemTheme()

  return <div className={props.readOnly ? 'opacity-70' : ''}>
    <Editor
      height={props.height}
      language={props.fileLanguage}
      value={props.value}
      onChange={!props.readOnly
        ? props.onChange
        : undefined
      }
      theme={theme === 'dark'
        ? SERAPHIM_DARK_THEME
        : SERAPHIM_LIGHT_THEME
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
          enabled: props.minimapOverride ?? true,
        },
        scrollBeyondLastLine: true,
        readOnly: props.readOnly ?? false,
      }}
    />
  </div>
}
