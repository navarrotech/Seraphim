// Copyright © 2025 Jalapeno Labs

import type { NotificationConstructorOptions } from 'electron'

// Core
import chalk from 'chalk'
import { app, Notification } from 'electron'

// set the AppUserModelID on Windows so notifications group under our app name
if (process.platform === 'win32') {
  app.setAppUserModelId('io.jalapenolabs.seraphim')
}

// helper to fire a notification from main
export function osToast(params: NotificationConstructorOptions) {
  // check platform support
  if (!Notification.isSupported()) {
    console.warn(
      chalk.yellow('Notifications not supported on this platform')
    )
    return null
  }

  return new Notification(params)
}
