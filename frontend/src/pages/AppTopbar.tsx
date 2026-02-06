// Copyright © 2026 Jalapeno Labs

// Core
import { Link, useLocation, useNavigate } from 'react-router-dom'

// User interface
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'
import { ExitIcon, SettingsIcon, UserIcon } from '@frontend/common/IconNexus'

function isWorkspaceRoute(pathname: string) {
  return pathname.startsWith('/workspace') || pathname.startsWith('/workspaces')
}

function isTaskRoute(pathname: string) {
  return pathname.startsWith('/tasks')
}

function isLlmRoute(pathname: string) {
  return pathname.startsWith('/llms')
}

export function AppTopbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isWorkspaceActive = isWorkspaceRoute(location.pathname)
  const isTasksActive = isTaskRoute(location.pathname)
  const isLlmsActive = isLlmRoute(location.pathname)

  async function handleExitApp() {
    if (!window.config?.exitApp) {
      console.debug('AppTopbar missing exit app handler', { config: window.config })
      return
    }

    try {
      await window.config.exitApp()
    }
    catch (error) {
      console.debug('AppTopbar failed to exit app', { error })
    }
  }

  function handleOpenSettings() {
    navigate(UrlTree.settings)
  }

  function handleOpenConnectedAccounts() {
    navigate(UrlTree.connectedAccounts)
  }

  return <header className={`border-b border-black/5 bg-white/70 px-6 py-4 backdrop-blur
  dark:border-white/10 dark:bg-slate-950/70`}>
    <div className='flex items-center justify-between'>
      <div className='level-left'>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10
          bg-white/80 text-sm font-semibold tracking-wide dark:border-white/10 dark:bg-slate-900/70`}
        >
          <span>S</span>
        </div>
      </div>
      <nav className='level-centered'>
        <Button
          as={Link}
          to={UrlTree.tasksList}
          variant={isTasksActive ? 'solid' : 'light'}
        >
          <span>Tasks</span>
        </Button>
        <Button
          as={Link}
          to={UrlTree.workspacesList}
          variant={isWorkspaceActive ? 'solid' : 'light'}
        >
          <span>Workspaces</span>
        </Button>
        <Button
          as={Link}
          to={UrlTree.llms}
          variant={isLlmsActive ? 'solid' : 'light'}
        >
          <span>LLMs</span>
        </Button>
      </nav>
      <div className='level-right'>
        <Dropdown placement='bottom-end'>
          <DropdownTrigger>
            <Button variant='light' isIconOnly>
              <Avatar name='User' size='sm' />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label='User menu'>
            <DropdownItem
              key='accounts'
              onPress={handleOpenConnectedAccounts}
              startContent={
                <span className='icon text-lg'>
                  <UserIcon />
                </span>
              }
            >
              <span>Connected Accounts</span>
            </DropdownItem>
            <DropdownItem
              key='settings'
              onPress={handleOpenSettings}
              startContent={
                <span className='icon text-lg'>
                  <SettingsIcon />
                </span>
              }
            >
              <span>Settings</span>
            </DropdownItem>
            <DropdownItem
              key='exit'
              color='danger'
              onPress={handleExitApp}
              startContent={
                <span className='icon text-lg'>
                  <ExitIcon />
                </span>
              }
            >
              <span>Exit</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  </header>
}
