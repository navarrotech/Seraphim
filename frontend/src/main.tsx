// Copyright © 2026 Jalapeno Labs

// Globals
import './env'
import './framework/hotkeys'

// Core
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Gates
import { ToastProvider } from '@heroui/react'
import { HeroUIProviderCustom } from './gates/HeroUiGate'
import { Router } from './Router'

// Styles
import './index.css'
import { ConfirmGate } from './gates/ConfirmGate'
import { PromptGate } from './gates/PromptGate'
import { UnsavedWorkGate } from './gates/UnsavedWorkGate'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(
  <BrowserRouter>
    <HeroUIProviderCustom>
      <ConfirmGate>
        <PromptGate>
          <UnsavedWorkGate>
              <ToastProvider />
              <Router />
          </UnsavedWorkGate>
        </PromptGate>
      </ConfirmGate>
    </HeroUIProviderCustom>
  </BrowserRouter>,
)
