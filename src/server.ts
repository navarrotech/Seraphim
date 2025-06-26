// Copyright © 2025 Jalapeno Labs

import type { ChromeLogPayload } from './types'

// Core
import chalk from 'chalk'
import express from 'express'
import http from 'http'
import { API_PORT, BLACKLIST_CHROME_LOGS_MATCHES } from './constants'

const app = express()
const server = http.createServer(app)

app.use(express.json())

const logsByTabUrl: Record<string, ChromeLogPayload[]> = {}

type ResetPayload = {
  tabId: number
  url?: string
}
app.post('/reset', async (request, response) => {
  const payload: ResetPayload = request.body

  if (!payload || !payload.url) {
    console.error('Invalid payload received:', payload)
    response.sendStatus(400)
    return
  }

  delete logsByTabUrl[payload.url]
  logReset(payload)

  response.sendStatus(200)
})

app.post('/chrome-report', async (request, response) => {
  const payload: ChromeLogPayload = request.body

  if (!payload || !payload.url || !payload.method || !payload.type || !payload.message === undefined) {
    console.error('Invalid payload received:', payload)
    response.sendStatus(400)
    return
  }

  if (!isWorthy(payload)) {
    return
  }

  if (!logsByTabUrl[payload.url]) {
    logsByTabUrl[payload.url] = []
  }

  logIncoming(payload)
  logsByTabUrl[payload.url].push(payload)

  if (payload.message === 'Object') {
    console.log(payload)
  }

  response.sendStatus(200)
})

function isWorthy(payload: ChromeLogPayload): boolean {
  return !BLACKLIST_CHROME_LOGS_MATCHES.some((blacklist) => payload.message.includes(blacklist))
}

function logIncoming(payload: ChromeLogPayload) {
  let urlHost: string = payload.url
  try {
    const url = new URL(payload.url)
    urlHost = url.host
  }
  catch (error) {
    console.error('Invalid URL in payload:', payload.url, error)
  }
  console.debug(`[CHROME]: ${chalk.green(urlHost)} ${payload.type} ${chalk.blue(payload.message)}`)
}

function logReset(payload: ResetPayload) {
  let urlHost: string = payload.url
  try {
    const url = new URL(payload.url)
    urlHost = url.host
  }
  catch (error) {
    console.error('Invalid URL in payload:', payload.url, error)
  }
  console.debug(`[CHROME]: ${chalk.green(urlHost)} ${chalk.red('RESET')}`)
}

function logMessageCollection(logs: ChromeLogPayload[]) {
  if (logs.length) {
    const asMessages = logs.map((log) => log.message).slice(-10)
    if (logs.length > 10) {
      asMessages.unshift('...Earlier omitted...')
    }
    console.debug(asMessages)
  }
}

export function getLogsForTab(url: string = 'http://localhost'): ChromeLogPayload[] {
  const exact = logsByTabUrl[url]
  if (exact) {
    console.debug(`Found exact logs for tab URL: ${url}`)
    logMessageCollection(exact)
    return exact
  }

  for (const [ key, value ] of Object.entries(logsByTabUrl)) {
    if (key.startsWith(url)) {
      console.debug(`Found logs for tab URL starting with: ${key}`)
      logMessageCollection(value)
      return value
    }
  }

  for (const [ key, value ] of Object.entries(logsByTabUrl)) {
    if (key.includes(url)) {
      console.debug(`Found logs for tab URL containing: ${key}`)
      logMessageCollection(value)
      return value
    }
  }

  console.debug(`No logs found for tab URL: ${url}`)
  return []
}

server.listen(API_PORT, () => {
  console.log(`Server is running on http://localhost:${API_PORT}`)
})
