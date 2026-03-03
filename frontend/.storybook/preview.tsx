// Copyright © 2026 Jalapeno Labs

import type { ThemePreference } from '@common/types'
import type { Preview, StoryContext, StoryFn } from '@storybook/react'
import type { ReactNode } from 'react'

// Core
import { MemoryRouter } from 'react-router-dom'

// Redux
import { Provider } from 'react-redux'
import { store } from '../src/framework/store'

// User interface
import { HeroUIProviderCustom } from '../src/gates/HeroUiGate'
import { ThemeGate } from '../src/gates/ThemeGate'

// Misc
import '../src/index.css'

type ThemeDecoratorProps = {
  children: ReactNode
  themePreference: ThemePreference
}

function ThemeDecorator(props: ThemeDecoratorProps) {
  return <ThemeGate themePreference={props.themePreference}>{
    props.children
  }</ThemeGate>
}

function withAppProviders(Story: StoryFn, context: StoryContext) {
  const themePreference = resolveStorybookTheme(context.globals.theme)

  return <MemoryRouter>
    <Provider store={store}>
      <HeroUIProviderCustom>
        <ThemeDecorator themePreference={themePreference}>
          <div className='p-6'>
            <Story />
          </div>
        </ThemeDecorator>
      </HeroUIProviderCustom>
    </Provider>
  </MemoryRouter>
}

function resolveStorybookTheme(value: unknown): ThemePreference {
  if (isThemePreference(value)) {
    return value
  }

  if (value !== undefined) {
    console.debug('Storybook theme value is invalid, defaulting to system', {
      value,
    })
  }

  return 'system'
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light'
    || value === 'dark'
    || value === 'system'
}

const preview: Preview = {
  decorators: [
    withAppProviders,
  ],
  parameters: {
    actions: {
      argTypesRegex: '^on[A-Z].*',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for HeroUI components',
      defaultValue: 'system',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        showName: true,
      },
    },
  },
}

export default preview
