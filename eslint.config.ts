// Copyright © 2026 Jalapeno Labs

import { defineConfig, globalIgnores } from 'eslint/config'
import cliBaseConfig from '@jalapenolabs/cli/eslint'

export default defineConfig([{
  extends: [ cliBaseConfig ],
  },
  globalIgnores([
    '.yarn/**',
    '**/vite-env.d.ts',
    'common/src/vendor/**',
  ]),
  {
  files: [
    '**/*.stories.@(ts|tsx)',
    'frontend/.storybook/**/*.{ts,tsx}',
  ],
  rules: {
    'import/no-default-export': 'off',
  },
},
  {
  rules: {
    'react-hooks/exhaustive-deps': 'off',
    'license-header/header': [
      'error',
      [
        `// Copyright © ${new Date().getFullYear()} Jalapeno Labs`,
      ],
    ],
  },
}])
