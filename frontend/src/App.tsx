// Copyright © 2025 Jalapeno Labs

// Core
import { Navigate, Routes, Route } from 'react-router'
import { BrowserRouter, useNavigate, useHref } from 'react-router-dom'
import { HeroUIProvider, ToastProvider } from '@heroui/react'
import { useSystemTheme } from './hooks/useSystemTheme'

// Typescript
import type { NavigateOptions } from 'react-router-dom'
import type { ValidApplicationLink } from '@common/urls'

// Pages & Gates
import { ElectronGate } from './pages/gates/ElectronGate'
import { DashboardGate } from './pages/gates/DashboardGate'
import { Settings } from './pages/Settings'
import { Placeholder } from './pages/Placeholder'

// Constants
import { UrlTree, UNKNOWN_ROUTE_REDIRECT_TO } from '@common/urls'

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

export function App() {
  return <ElectronGate>
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  </ElectronGate>
}

function Router() {
  // Note: useNavigate can only be used in the context (child) of a Router
  const navigate = useNavigate()
  useSystemTheme(true)

  return <HeroUIProvider navigate={navigate} useHref={useHref}>
    <ToastProvider />
    <Routes>
      <Route path={UrlTree.root} element={<DashboardGate />}>
        <Route path={UrlTree.main} element={<Placeholder />} />
        <Route path={UrlTree.settings} element={<Settings />} />
      </Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </HeroUIProvider>
}
