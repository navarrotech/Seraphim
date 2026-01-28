// Copyright © 2026 Jalapeno Labs

// Core
import { Link, useLocation } from 'react-router-dom'

// User interface
import { Button } from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'

type SettingsTab = {
  label: string
  url: string
}

const settingsTabs: SettingsTab[] = [
  {
    label: 'Settings',
    url: UrlTree.settings,
  },
  {
    label: 'Connected Accounts',
    url: UrlTree.connectedAccounts,
  },
]

function isActiveTab(currentPath: string, tabUrl: string) {
  if (!currentPath) {
    console.debug('SettingsTabs missing current path')
    return false
  }

  return currentPath === tabUrl
}

export function SettingsTabs() {
  const location = useLocation()

  function renderTab(tab: SettingsTab) {
    const isActive = isActiveTab(location.pathname, tab.url)

    return <Button
      key={tab.url}
      as={Link}
      to={tab.url}
      variant={isActive ? 'solid' : 'light'}
    >
      <span>{tab.label}</span>
    </Button>
  }

  return <div className='level'>
    <div className='level-left gap-2'>
      {settingsTabs.map(renderTab)}
    </div>
  </div>
}
