// Copyright © 2025 Jalapeno Labs

// Typescript
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function ElectronGate(props: Props) {
  if (!window?.electron?.log) {
    // TODO: Make this look pretty!
    return <div>
      <h1>Electron environment not detected</h1>
      <p>Please ensure you are running this application in the jalapenolabsbs Electron environment.</p>
    </div>
  }

  logger.log('🔌 Electron connection established.')

  return props.children
}
