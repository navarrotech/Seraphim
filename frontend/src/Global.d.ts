// Copyright © 2026 Jalapeno Labs

import type { NavigateOptions } from 'react-router-dom'
import type { ValidApplicationLink } from '@common/urls'

declare global {
  interface Window {
    version: {
      node: string
      chrome: string
      electron: string
    },
    config: {
      getApiUrl: () => string
      exitApp: () => Promise<void>
    },
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
