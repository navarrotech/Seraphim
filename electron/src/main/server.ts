// Copyright © 2025 Jalapeno Labs

// Core
import express from 'express'
import http from 'http'
import expressWs from 'express-ws'

// Lib
import logger from 'electron-log'

// Misc
import { PORT } from '@common/constants'

const vanillaApp = express()
const { app } = expressWs(vanillaApp)
const server = http.createServer(app)

app.all('/', (request, response) => {
  response.send('Hello from the Seraphim server!')
})

let net: http.Server
export function startServer() {
  if (net) {
    logger.warn('Server is already running.')
    return
  }

  net = server.listen(PORT, () => {
    logger.log(`Vanilla server is running on port ${PORT}`)
  })
}

export function stopServer() {
  if (!net) {
    logger.warn('Server is not running.')
    return
  }

  net.close(() => {
    logger.log('Vanilla server has been stopped.')
    net = null
  })
}
