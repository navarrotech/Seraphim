// Copyright © 2026 Jalapeno Labs

// Globals
import './core/logging'
import './env'

// Core
import { createRoot } from 'react-dom/client'
import { App } from './App'

// Styles
import './styles/tailwind.css'
import './styles/application.sass'

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

root.render(<App />)
