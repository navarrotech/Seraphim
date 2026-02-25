// Copyright © 2026 Jalapeno Labs

// Core
import { loader as monacoLoader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Workers - Required for Vite + Electron local serving
// https://github.com/suren-atoyan/monaco-react?tab=readme-ov-file#loader-config
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Supported coding languages
import 'monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution.d.ts'
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution.d.ts'
import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution.d.ts'

export type Monaco = typeof monaco
export type Marker = monaco.editor.IMarkerData
export type IEditor = monaco.editor.IStandaloneCodeEditor
export type MonacoContext = {
  editor: IEditor,
  monaco: Monaco,
}

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new (jsonWorker as any)()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new (cssWorker as any)()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new (htmlWorker as any)()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new (tsWorker as any)()
    }
    return new (editorWorker as any)()
  },
}

export type MonacoFileLanguages =
  | 'plaintext'
  | 'systemverilog'

  // Web
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'javascript'
  | 'typescript'
  | 'json'

  // Data / config
  | 'yaml'
  | 'xml'
  | 'markdown'
  | 'ini'
  | 'dockerfile'

  // Popular back-end / scripting
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'shell'
  | 'powershell'

  // DB
  | 'sql'

export const SERAPHIM_DARK_THEME = 'seraphim-dark'
export const SERAPHIM_LIGHT_THEME = 'seraphim-light'

const seraphimDarkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '2AB3C0', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '2AB3C0', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '2AB3C0', fontStyle: 'italic' },

    { token: 'keyword', foreground: '4EA1FF' },
    { token: 'keyword.control', foreground: '4EA1FF' },
    { token: 'keyword.operator', foreground: '4EA1FF' },

    { token: 'type.identifier', foreground: '4EA1FF' },
    { token: 'type', foreground: '4EA1FF' },
    { token: 'number', foreground: '38F2E1' },

    { token: 'string', foreground: '38F2E1' },
    { token: 'string.escape', foreground: '38F2E1' },

    { token: 'identifier', foreground: 'C9F2FF' },
    { token: 'delimiter', foreground: 'C9F2FF' },
    { token: 'delimiter.bracket', foreground: 'C9F2FF' },
  ],
  colors: {
    'editor.background': '#0B0F1A',
    'editor.foreground': '#C9F2FF',

    'editorLineNumber.foreground': '#37506B',
    'editorLineNumber.activeForeground': '#C9F2FF',

    'editorCursor.foreground': '#C9F2FF',
    'editor.selectionBackground': '#103B5E',
    'editor.inactiveSelectionBackground': '#0C2B45',
    'editor.selectionHighlightBackground': '#38F2E120',

    'editor.lineHighlightBackground': '#0E1D30',
    'editor.lineHighlightBorder': '#00000000',

    'editorIndentGuide.background': '#12314A',
    'editorIndentGuide.activeBackground': '#1A4C6F',
    'editorWhitespace.foreground': '#FFFFFF1A',
    'editorRuler.foreground': '#38F2E116',

    'editorBracketMatch.background': '#38F2E118',
    'editorBracketMatch.border': '#38F2E160',

    'editorWidget.background': '#0B0F1A',
    'editorWidget.border': '#12314A',
    'editorHoverWidget.background': '#0B0F1A',
    'editorHoverWidget.border': '#12314A',

    'editorSuggestWidget.background': '#0B0F1A',
    'editorSuggestWidget.border': '#12314A',
    'editorSuggestWidget.foreground': '#C9F2FF',
    'editorSuggestWidget.selectedBackground': '#103B5E',
    'editorSuggestWidget.highlightForeground': '#38F2E1',

    'editor.findMatchBackground': '#38F2E133',
    'editor.findMatchHighlightBackground': '#38F2E11F',

    'editorError.foreground': '#FF5F6E',
    'editorWarning.foreground': '#38F2E1',
    'editorInfo.foreground': '#4EA1FF',

    'minimap.background': '#0B0F1A',
    'minimapSlider.background': '#38F2E118',
    'minimapSlider.hoverBackground': '#38F2E12A',
    'minimapSlider.activeBackground': '#38F2E13A',

    'scrollbarSlider.background': '#38F2E118',
    'scrollbarSlider.hoverBackground': '#38F2E12A',
    'scrollbarSlider.activeBackground': '#38F2E13A',
  },
}

const seraphimLightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '168C9E', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '168C9E', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '168C9E', fontStyle: 'italic' },

    { token: 'keyword', foreground: '1F6FEB' },
    { token: 'keyword.control', foreground: '1F6FEB' },
    { token: 'keyword.operator', foreground: '1F6FEB' },

    { token: 'type.identifier', foreground: '1F6FEB' },
    { token: 'type', foreground: '1F6FEB' },
    { token: 'number', foreground: '119DA4' },

    { token: 'string', foreground: '119DA4' },
    { token: 'string.escape', foreground: '119DA4' },

    { token: 'identifier', foreground: '1C2B39' },
    { token: 'delimiter', foreground: '1C2B39' },
    { token: 'delimiter.bracket', foreground: '1C2B39' },
  ],
  colors: {
    'editor.background': '#F6FBFF',
    'editor.foreground': '#1C2B39',

    'editorLineNumber.foreground': '#8AA7BF',
    'editorLineNumber.activeForeground': '#1C2B39',

    'editorCursor.foreground': '#1C2B39',
    'editor.selectionBackground': '#CFE9FF',
    'editor.inactiveSelectionBackground': '#E5F2FF',
    'editor.selectionHighlightBackground': '#119DA424',

    'editor.lineHighlightBackground': '#ECF6FF',
    'editor.lineHighlightBorder': '#00000000',

    'editorIndentGuide.background': '#D7E7F5',
    'editorIndentGuide.activeBackground': '#B9D2E8',
    'editorWhitespace.foreground': '#00000014',
    'editorRuler.foreground': '#1F6FEB12',

    'editorBracketMatch.background': '#1F6FEB12',
    'editorBracketMatch.border': '#1F6FEB3F',

    'editorWidget.background': '#F6FBFF',
    'editorWidget.border': '#D7E7F5',
    'editorHoverWidget.background': '#F6FBFF',
    'editorHoverWidget.border': '#D7E7F5',

    'editorSuggestWidget.background': '#F6FBFF',
    'editorSuggestWidget.border': '#D7E7F5',
    'editorSuggestWidget.foreground': '#1C2B39',
    'editorSuggestWidget.selectedBackground': '#E1F1FF',
    'editorSuggestWidget.highlightForeground': '#1F6FEB',

    'editor.findMatchBackground': '#119DA433',
    'editor.findMatchHighlightBackground': '#119DA41F',

    'editorError.foreground': '#E5484D',
    'editorWarning.foreground': '#119DA4',
    'editorInfo.foreground': '#1F6FEB',

    'minimap.background': '#F6FBFF',
    'minimapSlider.background': '#1F6FEB12',
    'minimapSlider.hoverBackground': '#1F6FEB1F',
    'minimapSlider.activeBackground': '#1F6FEB2B',

    'scrollbarSlider.background': '#1F6FEB12',
    'scrollbarSlider.hoverBackground': '#1F6FEB1F',
    'scrollbarSlider.activeBackground': '#1F6FEB2B',
  },
}

monacoLoader.config({
  //  tell the loader to use the npm-bundled Monaco instance.
  // This prevents the loader from injecting a <script> tag to a CDN.
  monaco,
})

let hasDefinedThemes = false

export async function initMonaco() {
  await monacoLoader.init()

  if (!hasDefinedThemes) {
    monaco.editor.defineTheme(SERAPHIM_DARK_THEME, seraphimDarkTheme)
    monaco.editor.defineTheme(SERAPHIM_LIGHT_THEME, seraphimLightTheme)
    hasDefinedThemes = true
  }
}

export function getMonacoFileLanguage(extension: string): MonacoFileLanguages {
  switch (extension) {
  // -------- config / text --------
  case 'ini':
  case 'env':
    return 'ini'
  case 'md':
  case 'mdx':
    return 'markdown'
  case 'csv':
  case 'txt':
  case 'log':
    return 'plaintext'

    // -------- hardware / verilog --------
  case 'v':
  case 'sv':
  case 'svh':
    return 'systemverilog'

    // -------- web --------
  case 'html':
  case 'htm':
    return 'html'
  case 'css':
    return 'css'
  case 'scss':
    return 'scss'
  case 'less':
    return 'less'
  case 'js':
  case 'jsx':
  case 'mjs':
  case 'cjs':
    return 'javascript'
  case 'ts':
  case 'tsx':
  case 'mts':
  case 'cts':
    return 'typescript'

    // -------- data / config --------
  case 'xml':
  case 'svg':
    return 'xml'
  case 'yaml':
  case 'yml':
    return 'yaml'
  case 'json':
  case 'jsonc':
  case 'jsonl':
  case 'ndjson':
    return 'json'
  case 'dockerfile':
    return 'dockerfile'

    // -------- back-end / scripting --------
  case 'py':
    return 'python'
  case 'java':
    return 'java'
  case 'c':
    return 'c'
  case 'h': // best-effort: treat headers as C
    return 'c'
  case 'cpp':
  case 'cc':
  case 'cxx':
  case 'hpp':
  case 'hh':
  case 'hxx':
    return 'cpp'
  case 'cs':
    return 'csharp'
  case 'go':
    return 'go'
  case 'rs':
    return 'rust'
  case 'php':
    return 'php'
  case 'rb':
    return 'ruby'
  case 'swift':
    return 'swift'
  case 'kt':
  case 'kts':
    return 'kotlin'
  case 'sh':
  case 'bash':
  case 'zsh':
    return 'shell'
  case 'ps1':
  case 'psm1':
  case 'psd1':
    return 'powershell'

    // -------- db --------
  case 'sql':
    return 'sql'

    // -------- fallbacks --------
  default:
    return 'plaintext'
  }
}
