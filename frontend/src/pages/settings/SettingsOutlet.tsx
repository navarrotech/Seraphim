// Copyright © 2026 Jalapeno Labs

// UI
import { SettingsSidebar } from './SettingsSidebar'
import { Outlet } from 'react-router'

export function SettingsOutlet() {
  return <>
    <SettingsSidebar />
    <div className='w-full'>
      <Outlet />
    </div>
  </>
}
