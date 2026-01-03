// Copyright © 2026 Jalapeno Labs

// Typescript
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

// Cannot use HeroUI, i18n or most hooks in this context!
// Because most custom hooks rely on window.electron
// No providers load before this component
export function ElectronGate(props: Props) {
  if (!window?.electron?.log) {
    return <main className='flex flex-col w-screen h-screen items-center justify-center gap-6'>
      <section className='text-center'>
        <h1 className='text-3xl font-bold compact'>Electron environment not detected</h1>
        <p>Please ensure you are running this application in the MooreslabAI Electron environment.</p>
      </section>
    </main>
  }

  return props.children
}
