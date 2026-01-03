// Copyright © 2026 Jalapeno Labs

import type { UnsubscribeFunction } from '@common/types'

let disposables: UnsubscribeFunction[] = []

export function register(disposable: UnsubscribeFunction): void {
  disposables.push(disposable)
}

export function unregister(disposable: UnsubscribeFunction): void {
  disposables = disposables.filter((target) => target !== disposable)
}

export function unregisterAll(): void {
  console.info('Unregistering all disposables')
  for (const disposable of disposables) {
    disposable()
  }
  disposables = []
}

interface EventEmitterLike<Args extends unknown[]> {
  on(event: string, listener: (...args: Args) => void): void
  off(event: string, listener: (...args: Args) => void): void
}

export function bindListenFunction<Args extends unknown[]>(
  emitter: EventEmitterLike<Args>,
  event: string,
  callback: (...args: Args) => void,
): UnsubscribeFunction {
  // Wrap the callback to ensure it can be unsubscribed later (absolute obj reference)
  const listener = (...args: Args) => callback(...args)

  emitter.on(event, listener)

  const unsubscribe: UnsubscribeFunction = () => {
    emitter.off(event, listener)
    unregister(unsubscribe)
  }

  register(unsubscribe)

  return unsubscribe
}
