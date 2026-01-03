// Copyright © 2026 Jalapeno Labs

import { defineConfig } from 'vite'
import { builtinModules } from 'module'
import path from 'path'

export default defineConfig(() => ({
  plugins: [],
  build: {
    // treat as a library so we can specify entry + cjs output
    lib: {
      entry: path.resolve(__dirname, 'src/extension.ts'),
      formats: [
        'cjs',
      ],

      // always emit exactly `extension.js`
      fileName() {
        return 'extension.js'
      },
    },
    target: 'node16',
    outDir: 'dist',

    rollupOptions: {
      // keep vscode import external
      external: [
        'vscode',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],

      output: {
        exports: 'auto',
      },
    },
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, '../common/src'),
    },
  },
}))
