// Copyright © 2026 Jalapeno Labs

import type { ReactNode } from 'react'
import type { Chalk } from 'chalk'

// Core
import { addToast } from '@heroui/react'
import chalk from 'chalk'

// UI
import { WarningIcon, DangerIcon, CheckIcon } from '@frontend/elements/graphics/IconNexus'


/**
 * doToast - Wrapper around addToast that logs toast messages to stdout and main.log
 * with colorized output based on the toast color prop.
 */
export function doToast(props: Parameters<typeof addToast>[0]): string {
  // Map toast colors to chalk colors for consistent log styling
  const colorMap: Record<string, InstanceType<typeof Chalk>> = {
    success: chalk.green,
    warning: chalk.yellow,
    danger: chalk.red,
    info: chalk.cyan,
    primary: chalk.blue,
    secondary: chalk.magenta,
    default: chalk.white,
  }

  const color = colorMap[props.color ?? 'default']

  // Log to stdout and main.log with color
  console.log(color(`Toast: ${props.title ?? ''}\n${props.description ?? ''}`))

  props.classNames = {
    // Allow text overflow with break-word:
    description: 'word-break text-black dark:text-white',
    base: 'toast flex flex-col items-start border-none bg-white dark:bg-content4',
    icon: 'w-6 h-6 fill-current',
    closeIcon: 'border-black/25 dark:border-white/25 bg-content2 text-black dark:text-white',
  }

  let chosenIcon: ReactNode = <CheckIcon name='check' />
  switch (props.color) {
  case 'warning':
    chosenIcon = <WarningIcon name='actionRequired' />
    break
  case 'danger':
    chosenIcon = <DangerIcon name='errorOccured' />
    break
  case 'primary':
  case 'success':
  case 'secondary':
  case 'default':
  case 'foreground':
  default:
    break
  }

  if (!props.icon) {
    props.icon = chosenIcon
  }

  if (props.closeIcon === false) {
    props.classNames.closeButton = 'hidden'
  }

  // Call the original toast function, preserving ToastProvider defaults
  return addToast(props)
}
