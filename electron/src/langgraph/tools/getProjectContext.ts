// Copyright © 2025 Jalapeno Labs

import type { ContextSnapshot } from '../types'

// Core
import { tool } from '@langchain/core/tools'

// Node.js
// import { isPathInWorkspaces } from '../utility/isPathInWorkspaces'
import { walkFilenameSearch } from '@common/node/walkFilenameSearch'

export function getProjectContext(snapshot: ContextSnapshot) {
  return tool(
    async () => {
      const baseDir = snapshot.state.data.activeVsCodeState.workspacePaths[0]?.path
      const allPackageJsons = walkFilenameSearch(baseDir, 'package.json')
      const allTsConfigs = walkFilenameSearch(baseDir, 'tsconfig.json')
      const allPyProjectTomls = walkFilenameSearch(baseDir, 'pyproject.toml')
      const allVitestConfigs = walkFilenameSearch(baseDir, 'vitest.config.*')
      const allViteConfigs = walkFilenameSearch(baseDir, 'vite.config.*')
      const allReadmeMd = walkFilenameSearch(baseDir, 'README.md')

      // TODO: Improve this!

      return {
        packageJson: allPackageJsons,
        tsconfig: allTsConfigs,
        pyproject: allPyProjectTomls,
        vitest: allVitestConfigs,
        vite: allViteConfigs,
        readme: allReadmeMd
      }
    },
    {
      name: 'getProjectContext',
      description: 'Get context about the project.'
      + ' tsconfig.json paths, and some basic project paths.'
    }
  )
}
