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

monacoLoader.config({
  //  tell the loader to use the npm-bundled Monaco instance.
  // This prevents the loader from injecting a <script> tag to a CDN.
  monaco,
})

export async function initMonaco() {
  await monacoLoader.init()
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
