// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect, useRef, useState } from 'react'

// User interface
import { Input } from '@heroui/react'

export type HotkeyInputProps = {
  label: string
  value: string
  isDisabled?: boolean
  onChange: (value: string) => void
}

type ModifierKey = 'Control' | 'Shift' | 'Alt' | 'Meta'

type HotkeyCapture = {
  accelerator: string
}

const modifierOrder: ModifierKey[] = [ 'Control', 'Shift', 'Alt', 'Meta' ]

const numpadKeyMap: Record<string, string> = {
  Numpad0: 'Num0',
  Numpad1: 'Num1',
  Numpad2: 'Num2',
  Numpad3: 'Num3',
  Numpad4: 'Num4',
  Numpad5: 'Num5',
  Numpad6: 'Num6',
  Numpad7: 'Num7',
  Numpad8: 'Num8',
  Numpad9: 'Num9',
  NumpadDecimal: 'NumDecimal',
  NumpadAdd: 'NumAdd',
  NumpadSubtract: 'NumSub',
  NumpadMultiply: 'NumMult',
  NumpadDivide: 'NumDiv',
  NumpadEnter: 'NumEnter',
}

const keyLabelMap: Record<string, string> = {
  ' ': 'Space',
  'ArrowUp': 'ArrowUp',
  'ArrowDown': 'ArrowDown',
  'ArrowLeft': 'ArrowLeft',
  'ArrowRight': 'ArrowRight',
  'Enter': 'Enter',
  'Tab': 'Tab',
  'Backspace': 'Backspace',
  'Delete': 'Delete',
  'Home': 'Home',
  'End': 'End',
  'PageUp': 'PageUp',
  'PageDown': 'PageDown',
}

function isModifierKey(key: string): key is ModifierKey {
  return key === 'Control'
    || key === 'Shift'
    || key === 'Alt'
    || key === 'Meta'
}

function resolveHotkey(event: KeyboardEvent): HotkeyCapture | null {
  const modifiers = resolveModifiers(event)

  const key = event.key
  if (!key) {
    console.debug('HotkeyInput received a keydown without a key')
    return null
  }

  if (isModifierKey(key)) {
    console.debug('HotkeyInput ignores modifier-only key presses', {
      key,
    })
    return null
  }

  const normalizedKey = normalizeKey(event)
  if (!normalizedKey) {
    console.debug('HotkeyInput could not normalize key', {
      key,
      code: event.code,
    })
    return null
  }

  const acceleratorParts = [ ...modifiers, normalizedKey ]

  return {
    accelerator: acceleratorParts.join('+'),
  }
}

function resolveModifiers(event: KeyboardEvent): ModifierKey[] {
  return modifierOrder.filter((modifier) => {
    if (modifier === 'Control') {
      return event.ctrlKey
    }
    if (modifier === 'Shift') {
      return event.shiftKey
    }
    if (modifier === 'Alt') {
      return event.altKey
    }
    if (modifier === 'Meta') {
      return event.metaKey
    }
    return false
  })
}

function normalizeKey(event: KeyboardEvent) {
  const mappedNumpadKey = numpadKeyMap[event.code]
  if (mappedNumpadKey) {
    return mappedNumpadKey
  }

  const key = event.key
  if (!key) {
    return ''
  }

  return keyLabelMap[key] || normalizeAlphaKey(key)
}

function normalizeAlphaKey(key: string) {
  if (key.length === 1) {
    return key.toUpperCase()
  }

  return key
}

function buildPreviewValue(modifiers: ModifierKey[], key?: string) {
  const parts = [ ...modifiers ]
  if (key) {
    parts.push(key as any)
  }

  return parts.join('+')
}

export function HotkeyInput(props: HotkeyInputProps) {
  const { label, value, isDisabled = false, onChange } = props

  const [ isListening, setIsListening ] = useState<boolean>(false)
  const [ displayValue, setDisplayValue ] = useState<string>('')

  const inputRef = useRef<HTMLInputElement | null>(null)
  const listeningRef = useRef<boolean>(false)
  const modifierRef = useRef<Set<ModifierKey>>(new Set())
  const nonModifierKeyRef = useRef<string>('')

  useEffect(function syncDisplayValue() {
    if (!isListening) {
      setDisplayValue(value)
    }
  }, [ isListening, value ])

  useEffect(function syncListeningRef() {
    listeningRef.current = isListening
  }, [ isListening ])

  useEffect(function captureHotkey() {
    if (!isListening || isDisabled) {
      return () => {}
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.repeat || !listeningRef.current) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        console.debug('HotkeyInput capture canceled')
        setIsListening(false)
        setDisplayValue(value)
        modifierRef.current.clear()
        nonModifierKeyRef.current = ''
        return
      }

      const normalizedKey = normalizeKey(event)
      if (!normalizedKey) {
        return
      }

      if (isModifierKey(event.key)) {
        modifierRef.current.add(event.key)
      }
 else {
        nonModifierKeyRef.current = normalizedKey
      }

      const modifiers = resolveModifiers(event)
      const previewValue = buildPreviewValue(modifiers, nonModifierKeyRef.current)
      setDisplayValue(previewValue)

      const resolved = resolveHotkey(event)
      if (!resolved) {
        return
      }

      onChange(resolved.accelerator)
      setIsListening(false)
      modifierRef.current.clear()
      nonModifierKeyRef.current = ''
    }

    function handleKeyup(event: KeyboardEvent) {
      if (!listeningRef.current) {
        return
      }

      if (isModifierKey(event.key)) {
        modifierRef.current.delete(event.key)
      }
 else if (normalizeAlphaKey(event.key) === nonModifierKeyRef.current) {
        nonModifierKeyRef.current = ''
      }

      const modifiers = resolveModifiers(event)
      const previewValue = buildPreviewValue(modifiers, nonModifierKeyRef.current)
      setDisplayValue(previewValue)
    }

    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyup)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('keyup', handleKeyup)
    }
  }, [ isDisabled, isListening, onChange, value ])

  function startListening() {
    if (isDisabled) {
      console.debug('HotkeyInput ignored click while disabled')
      return
    }

    modifierRef.current.clear()
    nonModifierKeyRef.current = ''
    setIsListening(true)
    setDisplayValue('')
  }

  function handleFocus() {
    startListening()
  }

  function handleBlur() {
    if (!isListening) {
      return
    }

    console.debug('HotkeyInput stopped listening due to blur')
    setIsListening(false)
    setDisplayValue(value)
    modifierRef.current.clear()
    nonModifierKeyRef.current = ''
  }

  function handleClick() {
    if (isDisabled) {
      console.debug('HotkeyInput ignored click while disabled')
      return
    }

    startListening()
    inputRef.current?.focus()
  }

  let helpText = 'Click to set a hotkey.'
  if (isListening) {
    helpText = 'Press your hotkeys now. Press Esc to cancel.'
  }

  return <div className='relaxed'>
    <div
      className={`rounded-xl border border-transparent transition-all ${
        isListening
          ? 'ring-2 ring-sky-400/70 shadow-lg shadow-sky-500/20'
          : 'hover:border-slate-200/60'
      }`}
      onClick={handleClick}
    >
      <Input
        ref={inputRef}
        label={label}
        placeholder='Press a hotkey'
        value={displayValue || value}
        isDisabled={isDisabled}
        isReadOnly
        className='w-full'
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
    <p className='text-sm opacity-70'>{
      helpText
    }</p>
  </div>
}
