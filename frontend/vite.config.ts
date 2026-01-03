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
// https://tailwindcss.com/docs/installation/using-vite
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [
    // Absolute imports:
    tsconfigPaths(),
    // React language + JSX:
    react(),
    // Svgs:
    svgr(),
    // Tailwind CSS:
    tailwindcss(),
    // Full reload when i18next en/translation.json changes:
    fullReload([ 'public/locales/**/*.json' ]),
  ],
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
        quietDeps: true,
        additionalData: `
          @use '@/styles/theme.sass' as *
          @use 'sass:color'
        `,
      },
      scss: {
        api: 'modern-compiler',
        quietDeps: true,
        additionalData: `
          @use '@/styles/theme.sass' as *;
          @use 'sass:color';
        `,
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
