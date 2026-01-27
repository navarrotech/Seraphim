// Copyright © 2026 Jalapeno Labs

// Core
import config from './vite.config'
import { defineConfig } from 'vite'

// Node.js
import { resolve } from 'path'
import { existsSync, rmSync } from 'fs'
import { builtinModules } from 'module'

// This build configuration is NOT used for building electron
// It's only used for testing to ensure if electron can build and compile.
// The main bundling + building is done via electron forge.
// However, electron forge doesn't expose an easy way to "build and compile without running"
// So this is the workaround config, that just returns 0 if it's compliable or 1 if it's not.

export default defineConfig({
  ...config,
  plugins: [
    {
      name: 'remove-dist-after-build',
      // Called after all assets have been written
      closeBundle(): void {
        const distPath = resolve(__dirname, 'dist')
        if (existsSync(distPath)) {
          rmSync(distPath, { recursive: true, force: true })
          console.log('🗑️ Removed temporary testing dist')
        }
      },
    },
  ],
  build: {
    manifest: true,
    rollupOptions: {
      input: './src/main.ts',
      external: [
        // @ts-ignore
        ...(config.build?.rollupOptions?.external ?? []),
        'electron',
        'electron/main',
        'electron/renderer',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        'npm-run-path',
        'unicorn-magic',
      ],
    },
    // (In KB) We don't need to worry about large assets, as this is a desktop app deployed via GUI.
    // The only reason we would be concerned about this is if it was being served over a network.
    // It's served straight from the disk so it's not a big deal.
    // https://vite.dev/config/build-options.html#build-chunksizewarninglimit
    chunkSizeWarningLimit: 1_000 * 100, // 100 MB
  },
})
