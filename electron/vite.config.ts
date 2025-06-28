// Copyright © 2025 MooreslabAI

import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    {
      // This will tell Electron to restart the app when the main process code changes.
      // https://github.com/electron/forge/issues/682#issuecomment-1793552649
      name: "restart",
      closeBundle() {
        process.stdin.emit("data", "rs");
      },
    },
  ],
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, '../common/src'),
      '@': path.resolve(__dirname, 'src')
    },
  }
})
