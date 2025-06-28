// Copyright © 2025 Jalapeno Labs

// Core
import { contextBridge } from 'electron'

// Typescript
import type { ElectronIpcBridge, VersionIpcVersion } from '@common/types'

// Lib
import { preloadLogger } from './logging'

contextBridge.exposeInMainWorld('electron', {
  log: preloadLogger
} as ElectronIpcBridge)

contextBridge.exposeInMainWorld('version', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
} as VersionIpcVersion)
