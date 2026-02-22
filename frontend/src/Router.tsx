// Copyright © 2026 Jalapeno Labs

// Core
import { Navigate, Route, Routes } from 'react-router'

// Misc
import { UNKNOWN_ROUTE_REDIRECT_TO, UrlTree } from '@common/urls'

export function Router() {
  return <>
    <Routes>
      <Route path={UrlTree.root}></Route>
      <Route path='*' element={<Navigate to={UNKNOWN_ROUTE_REDIRECT_TO} />} />
    </Routes>
  </>
}
