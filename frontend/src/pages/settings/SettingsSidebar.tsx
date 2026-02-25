// Copyright © 2026 Jalapeno Labs

// Core
import { NavLink } from 'react-router'
import { Card } from '@frontend/elements/Card'

// Misc
import { UrlTree } from '@common/urls'

export function SettingsSidebar() {
  return <aside className='max-w-sm w-full'>
    <Card className='relaxed' label='Application'>
      <NavLink to={UrlTree.generalSettings} className={navlinkClass}>
        <span>General settings</span>
      </NavLink>
      <NavLink to={UrlTree.promptSettings} className={navlinkClass}>
        <span>Prompt engineering</span>
      </NavLink>
    </Card>
    <Card className='relaxed' label='Data'>
      <NavLink to={UrlTree.repos} className={navlinkClass}>
        <span>Repos</span>
      </NavLink>
      <NavLink to={UrlTree.workspaces} className={navlinkClass}>
        <span>Workspaces</span>
      </NavLink>
      <NavLink to={UrlTree.llms} className={navlinkClass}>
        <span>LLMs</span>
      </NavLink>
      <NavLink to={UrlTree.issueTracking} className={navlinkClass}>
        <span>Issue tracking</span>
      </NavLink>
    </Card>
  </aside>
}

const baseNavlinkClass = 'block text-lg py-1.5 px-4 rounded mb-1'
function navlinkClass(actions: { isActive: boolean }) {
  const { isActive } = actions

  if (isActive) {
    return baseNavlinkClass + ' bg-primary-500 font-bold'
  }

  return baseNavlinkClass + ' opacity-80 font-normal hover:bg-black/20 hover:dark:bg-white/20'
}
