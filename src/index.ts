// Copyright © 2025 Jalapeno Labs

import './server'
import chalk from 'chalk'
import { ArgumentParser } from 'argparse'
import { version, description } from '../package.json'
import { startListeningForKeyEvents } from './actions'

const parser = new ArgumentParser({
  description
})

parser.add_argument('-v', '--version', { action: 'version', version })

parser.parse_args()

startListeningForKeyEvents()

console.info(`Seraphim CLI ${chalk.cyan()}v${version}${chalk.reset()} is ready and listening to hotkeys...`)
