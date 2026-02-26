// Copyright © 2026 Jalapeno Labs

import type { StorybookConfig } from '@storybook/react-vite'

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
}

export default storybookConfig
