// Copyright © 2026 Jalapeno Labs

// Globals
import './core/logging'
import './env'

// Core
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { ElectronGate } from './pages/gates/ElectronGate'
import { Router } from './Router'

// Styles
import './index.css'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(
  <ElectronGate>
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  </ElectronGate>,
)
