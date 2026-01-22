// Copyright © 2026 Jalapeno Labs

// Globals
import './env'

// Core
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Gates
import { Router } from './Router'

// Styles
import './index.css'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(
  <BrowserRouter>
    <Router />
  </BrowserRouter>,
)
