// Copyright © 2026 Jalapeno Labs

import { useState } from 'react'
import { Button } from '@heroui/react'

export function Navbar() {
  const [ isMuted, setIsMuted ] = useState(false)

  const toggleMute = () => setIsMuted((prev) => !prev)

  return <nav className='level-left compact'>
    <Button>Commit work</Button>
    <Button>Review work</Button>
    <Button
      aria-pressed={isMuted}
      onPress={toggleMute}
    >
      {isMuted ? 'Unmute' : 'Mute'}
    </Button>
  </nav>
}
