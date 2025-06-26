// Copyright © 2025 Jalapeno Labs

/* eslint-disable no-undef */

import { build } from 'esbuild'

build({
  entryPoints: [
    'src/background.ts'
  ],
  bundle: true,
  outdir: 'dist',
  platform: 'browser',
  target: [
    'chrome116'
  ],
  sourcemap: true
}).catch(() => process.exit(1))
