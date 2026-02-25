// Copyright © 2026 Jalapeno Labs

import type { StorybookConfig } from '@storybook/react-vite'

// Core
import { mergeConfig } from 'vite'
import appViteConfig from '../vite.config'

const storybookConfig: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [
    '../public',
  ],
  viteFinal: (config) => mergeConfig(config, appViteConfig),
}

export default storybookConfig
