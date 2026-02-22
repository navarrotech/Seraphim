// Copyright © 2026 Jalapeno Labs

/* @vitest-environment happy-dom */

import type { ThemePreference } from '@common/types'
import type { Root } from 'react-dom/client'
import type { Mock } from 'vitest'

// Core
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

// Redux
import { useSelector } from '@frontend/framework/store'

// Utility
import { useSystemTheme } from './useSystemTheme'

// Misc
import { installMatchMediaMock } from './__test__/systemThemeMocks'

// Misc
vi.mock('@frontend/core/redux-store', () => ({
  useSelector: vi.fn(),
}))

type RenderResult = {
  container: HTMLDivElement
  root: Root
  getThemeText: () => string
  rerender: () => Promise<void>
  cleanup: () => Promise<void>
}

describe('useSystemTheme', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
    setMockThemePreference(undefined)
  })

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        value: originalMatchMedia,
        configurable: true,
      })
    }
    else {
      Object.defineProperty(window, 'matchMedia', {
        value: undefined,
        configurable: true,
      })
    }

    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false)
  })

  it('returns light when preference is light', async () => {
    installMatchMediaMock(true)
    setMockThemePreference('light')

    const renderResult = await renderTheme()

    expect(renderResult.getThemeText()).toBe('light')
    await renderResult.cleanup()
  })

  it('returns dark when preference is dark', async () => {
    installMatchMediaMock(false)
    setMockThemePreference('dark')

    const renderResult = await renderTheme()

    expect(renderResult.getThemeText()).toBe('dark')
    await renderResult.cleanup()
  })

  it('uses system preference when preference is system', async () => {
    const matchMediaController = installMatchMediaMock(false)
    setMockThemePreference('system')

    const renderResult = await renderTheme()

    expect(renderResult.getThemeText()).toBe('light')

    await act(async () => {
      matchMediaController.setMatches(true)
    })

    expect(renderResult.getThemeText()).toBe('dark')
    await renderResult.cleanup()
  })

  it('updates when theme preference changes', async () => {
    installMatchMediaMock(true)
    setMockThemePreference('system')

    const renderResult = await renderTheme()

    expect(renderResult.getThemeText()).toBe('dark')

    await act(async () => {
      setMockThemePreference('light')
      await renderResult.rerender()
    })

    expect(renderResult.getThemeText()).toBe('light')

    await act(async () => {
      setMockThemePreference('dark')
      await renderResult.rerender()
    })

    expect(renderResult.getThemeText()).toBe('dark')
    await renderResult.cleanup()
  })

  it('falls back to light when matchMedia is missing', async () => {
    Object.defineProperty(window, 'matchMedia', {
      value: undefined,
      configurable: true,
    })
    setMockThemePreference('system')

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const renderResult = await renderTheme()

    expect(renderResult.getThemeText()).toBe('light')
    debugSpy.mockRestore()
    await renderResult.cleanup()
  })

  it('exposes a theme preference type', () => {
    const settings = buildUserSettings('system')

    expectTypeOf(settings.themePreference).toEqualTypeOf<ThemePreference>()
    settings.themePreference satisfies ThemePreference
  })
})

function ThemeConsumer() {
  const theme = useSystemTheme()
  return createElement('div', { 'data-theme-value': 'true' }, theme)
}

async function renderTheme(): Promise<RenderResult> {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const root = createRoot(container)
  async function rerender() {
    await act(async () => {
      root.render(
        createElement(ThemeConsumer),
      )
    })
  }

  await rerender()

  function getThemeText() {
    const themeElement = container.querySelector('[data-theme-value="true"]')
    if (!themeElement) {
      console.debug('Theme consumer element is missing while reading useSystemTheme output.')
      return ''
    }

    return themeElement.textContent || ''
  }

  async function cleanup() {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }

  return {
    container,
    root,
    getThemeText,
    rerender,
    cleanup,
  }
}

type MockUserSettings = {
  themePreference: ThemePreference
}

type MockState = {
  settings: {
    current: MockUserSettings | null
  }
}

function buildUserSettings(themePreference: ThemePreference): MockUserSettings {
  return {
    themePreference,
  }
}

function setMockThemePreference(themePreference: ThemePreference | undefined) {
  const settings = themePreference ? buildUserSettings(themePreference) : null
  const selectorMock = useSelector as typeof useSelector & Mock
  selectorMock.mockImplementation((selector: (state: MockState) => unknown) => {
    return selector({
      settings: {
        current: settings,
      },
    })
  })
}
