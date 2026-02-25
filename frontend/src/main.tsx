// Copyright © 2026 Jalapeno Labs

// Globals
import './env'
import './framework/hotkeys'
import { initMonaco } from './framework/monaco'

// Core
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { store } from './framework/store'
import { Router } from './Router'

// 3rd Party Gates
import { Provider } from 'react-redux'

// Custom Gates
import { ConfirmGate } from './gates/ConfirmGate'
import { PromptGate } from './gates/PromptGate'
import { UnsavedWorkGate } from './gates/UnsavedWorkGate'
import { InitialDataGate } from './gates/InitialDataGate'
import { ApiSocketGate } from './gates/ApiSocketGate'
import { ThemeGate } from './gates/ThemeGate'

// Styles
import './index.css'

initMonaco()

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(
  <Provider store={store}>
    <ApiSocketGate />
    <InitialDataGate>
      <ConfirmGate>
        <PromptGate>
          <UnsavedWorkGate>
            <ThemeGate>
              <RouterProvider router={Router} />
            </ThemeGate>
          </UnsavedWorkGate>
        </PromptGate>
      </ConfirmGate>
    </InitialDataGate>
  </Provider>,
)
