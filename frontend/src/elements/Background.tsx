// Copyright © 2026 Jalapeno Labs

// Core
import { useSystemTheme } from '@frontend/hooks/useSystemTheme'

// Graphics
import glassLight from '@frontend/elements/graphics/glassmoprhism-light.jpg'
import glassDark from '@frontend/elements/graphics/glassmoprhism-dark.jpg'

export function Background() {
  const theme = useSystemTheme()

  return <div
    className='fixed inset-0 -z-10 h-screen w-screen overflow-hidden'
    style={{
      transform: 'scale(1.1)',
    }}
  >
    <div
      className='blur-xl h-screen w-screen opacity-60'
      style={{
        backgroundImage: `url(${theme === 'dark'
          ? glassDark
          : glassLight
        })`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  </div>
}
