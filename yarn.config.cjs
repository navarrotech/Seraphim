// Copyright © 2026 Jalapeno Labs

/** @type {import('@yarnpkg/types')} */
const rootPkg = require('./package.json')

// For more information about this file, visit:
// https://yarnpkg.com/features/constraints

module.exports = {
  constraints: async (ctx) => {
    const { Yarn } = ctx

    // 1) Enforce a single version for every non-peer dep
    for (const dep of Yarn.dependencies()) {
      if (dep.type === 'peerDependencies') {
        continue
      }

      // find all other usages of this same package…
      for (const other of Yarn.dependencies({ ident: dep.ident })) {
        if (other.type === 'peerDependencies') {
          continue
        }

        // …and overwrite to match
        dep.update(other.range)
      }
    }

    // 2) Enforce identical engines fields everywhere
    const nodeEngine = rootPkg.engines.node
    const yarnEngine = rootPkg.engines.yarn
    for (const workspace of Yarn.workspaces()) {
      workspace.set('engines.node', nodeEngine)
      workspace.set('engines.yarn', yarnEngine)
    }
  },
}
