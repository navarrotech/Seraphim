// Copyright © 2026 Jalapeno Labs

import type { NavigateOptions } from 'react-router-dom'
import type { ValidApplicationLink } from '@common/urls'
import type {
  ElectronIpcBridge,
  VersionIpcVersion,
  ReduxIpcBridge,
} from '@common/types'

declare global {
  interface Window {
    electron: ElectronIpcBridge
    version: VersionIpcVersion
    redux: ReduxIpcBridge
  }
}

declare module '@react-types/shared' {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

declare module '@heroui/react' {
  // All hrefs in HeroUI components should be valid application links
  interface LinkProps {
    href: ValidApplicationLink
  }
}

export {}
