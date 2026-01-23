// Copyright © 2026 Jalapeno Labs

// Core
import { useNavigate } from 'react-router-dom'

// User interface
import { Button, Card } from '@heroui/react'

// Misc
import { UrlTree } from '@common/urls'

export function GettingStarted() {
  const navigate = useNavigate()

  function handleCreateWorkspace() {
    navigate(UrlTree.workspaceCreate)
  }

  return <main
    className={`relative flex min-h-screen items-center justify-center overflow-hidden
    bg-gradient-to-br from-amber-100 via-rose-100 to-sky-200`}
  >
    <div className='absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/40 blur-3xl' />
    <div className='absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/40 blur-3xl' />
    <Card className='relative z-10 w-full max-w-xl p-10'>
      <div className='relaxed text-center'>
        <div className='relaxed text-3xl font-semibold'>Welcome to Seraphim</div>
        <p className='opacity-80'>Kick off your first workspace and start orchestrating tasks.</p>
      </div>
      <div className='level-centered'>
        <Button onPress={handleCreateWorkspace}>Create Workspace</Button>
      </div>
    </Card>
  </main>
}
