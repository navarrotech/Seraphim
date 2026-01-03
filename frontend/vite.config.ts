// Copyright © 2026 Jalapeno Labs

import { defineConfig } from 'vite'

// Node.js
import path from 'path'

// Plugins
import react from '@vitejs/plugin-react-swc'
// https://www.npmjs.com/package/vite-tsconfig-paths
import tsconfigPaths from 'vite-tsconfig-paths'
// https://www.npmjs.com/package/vite-plugin-svgr
import svgr from 'vite-plugin-svgr'
// https://www.npmjs.com/package/vite-plugin-full-reload
import fullReload from 'vite-plugin-full-reload'
// https://stackoverflow.com/questions/74987006/tailwindcss-not-working-with-vite-react
import tailwindcss from 'tailwindcss'

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [
    // Absolute imports:
    tsconfigPaths(),
    // React language + JSX:
    react(),
    // Svgs:
    svgr(),
    // Full reload when i18next en/translation.json changes:
    fullReload([ 'public/locales/**/*.json' ]),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
      ],
    },
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, '../common/src'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
