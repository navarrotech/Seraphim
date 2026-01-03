// Copyright © 2026 Jalapeno Labs

import { Navigate, Routes, Route } from 'react-router'
import { useNavigate, useHref } from 'react-router-dom'
import { HeroUIProvider, ToastProvider } from '@heroui/react'

import { Settings } from './pages/Settings'
import { Terminal } from './pages/Terminal'
import { UrlTree, UNKNOWN_ROUTE_REDIRECT_TO } from '@common/urls'

export function Router() {
  // Note: useNavigate can only be used in the context (child) of a Router
  const navigate = useNavigate()

  return <HeroUIProvider navigate={navigate} useHref={useHref}>
    <ToastProvider />
    <Routes>
      <Route path={UrlTree.root}>
        <Route path={UrlTree.main} element={<Terminal />} />
        <Route path={UrlTree.settings} element={<Settings />} />
      </Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </HeroUIProvider>
}
