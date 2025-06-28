// Copyright © 2025 Jalapeno Labs

import { defineConfig } from 'vite'
import { resolve } from 'path'
import open from 'open'

function openOnRebuild() {
  return {
    name: 'open-on-rebuild',
    writeBundle() {
      // if you're using extension reloader, this is handy for dev!
      // https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid
      open('http://reload.extensions/').catch(err => {
        console.error('Failed to open browser:', err)
      })
    }
  }
}

export default defineConfig({
  plugins: [
    // If you're using extension reloader...
    // You can comment in this plugin locally for a better dev experience
    openOnRebuild()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/seraphim.ts'),
      formats: [
        'es'
      ],
      fileName: 'seraphim'
    },
    // Target modern Chrome version
    target: 'chrome116'
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, '../common/src')
    },
  }
})
