// Copyright © 2026 Jalapeno Labs

import type { LiteralUnion, Promisable } from 'type-fest'

export type EventKey = string
export type ValidKeys = LiteralUnion<
  | 'Control'
  | 'Shift'
  | 'Alt'
  | 'Meta',
  EventKey>

export type HotkeyOptions = {
  preventDefault?: boolean
  stopPropagation?: boolean
  blockOtherHotkeys?: boolean
}

type HotkeySubscription = {
  keys: ValidKeys[]
  callback: (event: KeyboardEvent) => Promisable<void>
  options?: HotkeyOptions
}

// Use a global, single event listener to window for tracking keys up/down
const keysDown = new Set<EventKey>()
const subscriptions: HotkeySubscription[] = []

// ////////////////////// //
//         Events         //
// ////////////////////// //

window.addEventListener('keydown', async (event) => {
  if (!validate(event) || event.repeat) {
    return
  }

  const key = <EventKey>event.key.toLowerCase()
  keysDown.add(key)

  await processHotkeySubscriptions(event)
})

window.addEventListener('keyup', (event) => {
  if (!validate(event)) {
    return
  }

  const key = <EventKey>event.key.toLowerCase()
  keysDown.delete(key)
})

// When the window loses focus
window.addEventListener('blur', () => {
  keysDown.clear()
})

// When the GUI is clicked off of
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    return
  }
  keysDown.clear()
})

// When the page navigates away
window.addEventListener('pagehide', () => {
  keysDown.clear()
})

// ////////////////////// //
//      Subscriptions     //
// ////////////////////// //

export function subscribeHotkey(
  keys: ValidKeys[],
  callback: (event: KeyboardEvent) => void,
  options?: HotkeyOptions,
): () => void {
  keys = keys.map((key) => key.toLowerCase() as ValidKeys)

  const subscription: HotkeySubscription = { keys, callback, options }
  subscriptions.push(subscription)

  return function unsubscribeHotkey() {
    const index = subscriptions.indexOf(subscription)
    if (index !== -1) {
      subscriptions.splice(index, 1)
    }
  }
}

// ////////////////////// //
//        Helpers         //
// ////////////////////// //

async function processHotkeySubscriptions(event: KeyboardEvent) {
  if (keysDown.size === 0) {
    return
  }

  const promises: Promisable<void>[] = []

  for (const subscription of subscriptions) {
    const allKeysDown = subscription.keys.every((key) => keysDown.has(key))
    if (!allKeysDown) {
      continue
    }

    console.debug(`+ Hotkey triggered: ${subscription.keys.join('+')}`)

    // Don't await the callback to avoid blocking other hotkeys
    const promise = subscription.callback(event)
    promises.push(promise)

    if (subscription.options?.preventDefault) {
      event.preventDefault()
    }
    if (subscription.options?.stopPropagation) {
      event.stopImmediatePropagation()
      event.stopPropagation()
    }
    if (subscription.options?.blockOtherHotkeys) {
      break
    }
  }

  await Promise.all(promises)
}

function validate(event: KeyboardEvent): boolean {
  const srcElement = event.target as HTMLElement

  const isModifierKeyDown = event.shiftKey || event.ctrlKey || event.altKey || event.metaKey
  const isUserEditingSomething = srcElement?.tagName === 'INPUT'
    || srcElement?.tagName === 'TEXTAREA'
    || srcElement?.isContentEditable

  // Don't trigger hotkeys when typing in inputs or textareas UNLESS a modifier key is held down
  // Therefor, ctrl+s will still work in a text input, but just 's' alone won't
  if (!isModifierKeyDown && isUserEditingSomething) {
    return false
  }

  return true
}
