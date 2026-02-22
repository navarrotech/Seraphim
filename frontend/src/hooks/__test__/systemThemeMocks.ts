// Copyright © 2026 Jalapeno Labs

// @ts-nocheck

export type MatchMediaController = {
  mediaQueryList: MediaQueryList
  setMatches: (nextMatches: boolean) => void
}

export class MediaQueryListChangeEvent extends Event {
  matches: boolean
  media: string

  constructor(matches: boolean, media: string) {
    super('change')
    this.matches = matches
    this.media = media
  }
}

export function installMatchMediaMock(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  function addEventListener(type: string, listener: (event: MediaQueryListEvent) => void) {
    if (type !== 'change') {
      console.debug(`Unsupported event type "${type}" passed to matchMedia.addEventListener.`)
      return
    }

    listeners.add(listener)
  }

  function removeEventListener(type: string, listener: (event: MediaQueryListEvent) => void) {
    if (type !== 'change') {
      console.debug(`Unsupported event type "${type}" passed to matchMedia.removeEventListener.`)
      return
    }

    listeners.delete(listener)
  }

  function dispatchEvent(event: MediaQueryListEvent) {
    for (const listener of listeners) {
      listener(event)
    }
    return true
  }

  function addListener(listener: (event: MediaQueryListEvent) => void) {
    listeners.add(listener)
  }

  function removeListener(listener: (event: MediaQueryListEvent) => void) {
    listeners.delete(listener)
  }

  function matchMedia(query: string) {
    void query
    return mediaQueryList
  }

  function getMatches() {
    return matches
  }

  function setMatches(nextMatches: boolean) {
    matches = nextMatches
    const changeEvent = new MediaQueryListChangeEvent(
      nextMatches,
      mediaQueryList.media,
    )

    mediaQueryList.dispatchEvent(changeEvent)

    if (typeof mediaQueryList.onchange === 'function') {
      mediaQueryList.onchange(changeEvent)
    }
  }

  const mediaQueryList = {
    media: '(prefers-color-scheme: dark)',
    get matches() {
      return getMatches()
    },
    onchange: null,
    addEventListener,
    removeEventListener,
    dispatchEvent,
    addListener,
    removeListener,
  } satisfies MediaQueryList

  Object.defineProperty(window, 'matchMedia', {
    value: matchMedia,
    configurable: true,
  })

  return {
    mediaQueryList,
    setMatches,
  }
}
