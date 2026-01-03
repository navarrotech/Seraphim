// Copyright © 2026 Jalapeno Labs

import { defineConfig } from 'vite'
import { builtinModules } from 'module'
import path from 'path'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    {
      // This will tell Electron to restart the app when the main process code changes.
      // https://github.com/electron/forge/issues/682#issuecomment-1793552649
      name: 'restart',
      closeBundle() {
        process.stdin.emit('data', 'rs')
      },
    },
  ],
  build: {
    target: 'node16',
    rollupOptions: {
      // keep vscode import external
      external: [
        'ws',
        'express',
        'express-ws',
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
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
