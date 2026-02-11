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
    label: 'General',
    url: UrlTree.settingsGeneral,
  },
  {
    label: 'Connected accounts',
    url: UrlTree.settingsGitRepos,
  },
  {
    label: 'Workspaces',
    url: UrlTree.settingsWorkspaces,
  },
  {
    label: 'LLMs',
    url: UrlTree.settingsLlms,
  },
  {
    label: 'Advanced',
    url: UrlTree.settingsAdvanced,
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
      className='w-full justify-start'
    >
      <span>{tab.label}</span>
    </Button>
  }

  return <div className='relaxed pt-4'>
    <div className='relaxed flex flex-col gap-2'>
      {settingsTabs.map(renderTab)}
    </div>
  </div>
}
