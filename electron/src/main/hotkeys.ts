// Copyright © 2025 Jalapeno Labs

// Core
import chalk from 'chalk'
import { globalShortcut } from 'electron'

// Available accelerators:
// https://www.electronjs.org/docs/latest/api/accelerator#available-key-codes

export function registerHotkeys() {
  globalShortcut.register('Control+Alt+numsub', () => {
    console.log('\n\n\n')
    console.log(`
# Seraphim Hotkeys

Ctrl + Alt = Num- = Show this help message
Ctrl + Alt + Num0 = Cancel last task on stack (TODO)
Ctrl + Alt + Num1 = Explain selected text (TODO)
Ctrl + Alt + Num2 = Suggest alternatives for selected text (TODO)
Ctrl + Alt + Num3 = Move selected function to a dedicated file (TODO)
Ctrl + Alt + Num4 = Finish writing selected function (TODO)
Ctrl + Alt + Num5 = Rewrite selected text (TODO)
Ctrl + Alt + Num6 = JSDoc selection (TODO)
Ctrl + Alt + Num7 = Analyze chrome/backend errors & fix (TODO)
Ctrl + Alt + Num8 = (TBD)
Ctrl + Alt + Num9 = Unit Test (TODO)
Ctrl + Alt + Num+ = Copy style (TODO)
Ctrl + Alt + Num* = Apply copied style to selection and complete function (TODO)
    `.trim())
  })
  globalShortcut.register('Control+Alt+num1', () => {
    console.log('Hotkey Control+Alt+num1 pressed!')
  })

  console.log(
    chalk.green('Registered hotkeys!')
  )
}
