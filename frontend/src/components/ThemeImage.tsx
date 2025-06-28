// Copyright © 2025 Jalapeno Labs

// Typescript
import type { ImageProps } from '@heroui/react'

// Utility
import { useSystemTheme } from '@frontend/hooks/useSystemTheme'

// UI
import { Image } from '@heroui/react'

type Props = Omit<ImageProps, 'src'> & {
  src: string
  themeOverride?: string
}

export function ThemeImage({ themeOverride, src, ...props }: Props) {
  const systemTheme = useSystemTheme()
  const themeSrc = themeOverride ?? systemTheme

  return <Image
    {...props}
    src={`/theme/${themeSrc}/${src}`}
  />
}
