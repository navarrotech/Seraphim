// Copyright © 2026 Jalapeno Labs

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('version', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
})
