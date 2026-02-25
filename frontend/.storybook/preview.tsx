// Copyright © 2026 Jalapeno Labs

import type { Preview, StoryFn } from '@storybook/react'

// Core
import { MemoryRouter } from 'react-router-dom'

// Redux
import { Provider } from 'react-redux'
import { store } from '../src/framework/store'

// User interface
import { HeroUIProviderCustom } from '../src/gates/HeroUiGate'

// Misc
import '../src/index.css'

function withAppProviders(Story: StoryFn) {
  return <MemoryRouter>
    <Provider store={store}>
      <HeroUIProviderCustom>
        <div className='p-6'>
          <Story />
        </div>
      </HeroUIProviderCustom>
    </Provider>
  </MemoryRouter>
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
}

export default preview
