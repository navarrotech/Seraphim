// Copyright © 2026 Jalapeno Labs

import type { NavigateOptions } from 'react-router-dom'
import type { ValidApplicationLink } from '@common/urls'
import type { OpenDialogOptions, CommandResponse } from '@common/types'

declare global {
  interface Window {
    version: {
      node: string
      chrome: string
      electron: string
    },
    config: {
      exitApp: () => Promise<void>
      restartGui: () => Promise<void>,
      openDialog: (options: OpenDialogOptions) => Promise<string[] | null>,
      openFileBrowserTo: (filePath: string) => Promise<CommandResponse>,
      openCodeEditorTo: (filePath: string) => Promise<CommandResponse>,
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
