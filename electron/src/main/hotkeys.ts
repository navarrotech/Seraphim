// Copyright © 2025 Jalapeno Labs

// Core
import chalk from 'chalk'
import { globalShortcut } from 'electron'

// Utility
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { getProjectConfig } from '../langgraph/utility/getProjectConfig'

// Available accelerators:
// https://www.electronjs.org/docs/latest/api/accelerator#available-key-codes

export function registerHotkeys() {
  // Help command
  globalShortcut.register('Control+Alt+numsub', () => {
    console.log('\n\n\n')
    console.info(`
${chalk.cyanBright('# Seraphim Hotkeys')}

Ctrl + Alt = Num- = ${chalk.blue('Show this help message')}
Ctrl + Alt + Num0 = ${chalk.blue('Cancel last task on stack')} (TODO)
Ctrl + Alt + Num1 = ${chalk.blue('Explain selected text')} (TODO)
Ctrl + Alt + Num2 = ${chalk.blue('Suggest alternatives for selected text')} (TODO)
Ctrl + Alt + Num3 = ${chalk.blue('Move selected function to a dedicated file')} (TODO)
Ctrl + Alt + Num4 = ${chalk.blue('Finish writing selected function')} (TODO)
Ctrl + Alt + Num5 = ${chalk.blue('Rewrite selected text')} (TODO)
Ctrl + Alt + Num6 = ${chalk.blue('JSDoc selection')}
Ctrl + Alt + Num7 = ${chalk.blue('Analyze chrome/backend errors & fix')} (TODO)
Ctrl + Alt + Num8 = ${chalk.blue('')}
Ctrl + Alt + Num9 = ${chalk.blue('Unit Test')} (TODO)
Ctrl + Alt + Num+ = ${chalk.blue('Copy style')} (TODO)
Ctrl + Alt + Num* = ${chalk.blue('Apply copied style to selection and complete function')} (TODO)
    `.trim())
  })

  // Cancel last task on stack
  globalShortcut.register('Control+Alt+num0', () => {
    console.log('Cancel command requested, but not implement!')
  })

  // Explain selected text
  globalShortcut.register('Control+Alt+num1', async () => {
    console.log('Explain command requested, but not implemented!')
  })

  // Suggest alternatives for selected text
  globalShortcut.register('Control+Alt+num2', async () => {
    console.log('Suggest alternatives command requested, but not implemented!')
  })

  // Move selected function to a dedicated file
  globalShortcut.register('Control+Alt+num3', async () => {
    console.log('Move function command requested, but not implemented!')
  })

  // Finish writing selected function
  globalShortcut.register('Control+Alt+num4', async () => {
    console.log('Finish function command requested, but not implemented!')
  })

  // Rewrite selected text
  globalShortcut.register('Control+Alt+num5', async () => {
    console.log('Rewrite command requested, but not implemented!')
  })

  // JSDoc selection
  globalShortcut.register('Control+Alt+num6', async () => {
  })

  // Analyze chrome/backend errors & fix
  globalShortcut.register('Control+Alt+num7', async () => {
    console.log('Analyze errors command requested, but not implemented!')
  })

  // TBD command
  globalShortcut.register('Control+Alt+num8', async () => {
    console.log('Nothing is registered on this command yet!')
  })

  // Unit Test
  globalShortcut.register('Control+Alt+num9', async () => {
    console.log('Unit Test command requested, but not implemented!')
  })

  // Copy style
  globalShortcut.register('Control+Alt+numadd', async () => {
    console.log('Copy style command requested, but not implemented!')
  })

  // Apply copied style to selection and complete function
  globalShortcut.register('Control+Alt+nummult', async () => {
    console.log('Apply copied style command requested, but not implemented!')
  })

  console.log(
    chalk.green('Registered hotkeys!')
  )
}
