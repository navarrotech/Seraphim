// Copyright © 2025 Jalapeno Labs

// Payload sent to your server
type LogPayload = {
  tabId: number
  timestamp: number
  method: string
  type: string
  message: string
  url?: string
}

// Check whether a URL is localhost (http or https, any port)
function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && parsed.hostname === 'localhost'
    )
  }
  catch {
    return false
  }
}
function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 1000
): Promise<Response> {
  // Create an AbortController to be able to cancel fetch
  const controller = new AbortController()
  // Grab any existing signal and merge ours
  const { signal: originalSignal } = options
  const signal = controller.signal

  // If caller passed in a signal, cancel our controller if theirs aborts
  if (originalSignal) {
    originalSignal.addEventListener('abort', () => controller.abort())
  }

  // Kick off a timer that will abort the fetch
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Actually do the fetch
  return fetch(url, { ...options, signal })
    .then((response) => {
      // Clear the timer once we have a response, even if non-2xx
      clearTimeout(timeoutId)
      return response
    })
    .catch((err) => {
      // Normalize the error for timeouts
      if (err.name === 'AbortError') {
        throw new Error(`Fetch timed out after ${timeout} ms`)
      }
      throw err
    })
}

// Centralized POST helper
function sendLogToServer(payload: LogPayload) {
  fetchWithTimeout('http://localhost:9841/chrome-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .catch(console.log)
}

// Notify the server to reset state when a tab is created or refreshed
function sendResetToServer(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      return
    }
    if (!tab.url) {
      return
    }
    const resetPayload = {
      tabId,
      url: tab.url
    }
    fetchWithTimeout('http://localhost:9841/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resetPayload)
    })
      .catch(console.log)
  })
}

// Attach the debugger only if the tab’s URL is localhost
function attachDebuggerToTab(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      return
    }
    if (!tab.url || !isLocalhostUrl(tab.url)) {
      return
    }
    const debuggee = { tabId }
    chrome.debugger.attach(debuggee, '1.3', () => {
      if (chrome.runtime.lastError) {
        return
      }
      chrome.debugger.sendCommand(debuggee, 'Runtime.enable')
      chrome.debugger.sendCommand(debuggee, 'Console.enable')
    })
  })
}

// Detach the debugger when the tab is closed or navigated away
function detachDebuggerFromTab(tabId: number) {
  const debuggee = { tabId }
  chrome.debugger.detach(debuggee)
}

// On extension startup, attach to all existing localhost tabs
chrome.tabs.query({}, (tabs) => {
  for (const tab of tabs) {
    if (typeof tab.id === 'number' && tab.url && isLocalhostUrl(tab.url)) {
      // reset server state for each existing localhost tab
      sendResetToServer(tab.id)
      attachDebuggerToTab(tab.id)
    }
  }
})

// Whenever a new tab is created, reset and attach if localhost
chrome.tabs.onCreated.addListener((tab) => {
  if (typeof tab.id === 'number') {
    sendResetToServer(tab.id)
    attachDebuggerToTab(tab.id)
  }
})

// Watch for navigations: reset and attach when loading localhost, detach otherwise
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    if (isLocalhostUrl(tab.url)) {
      sendResetToServer(tabId)
      attachDebuggerToTab(tabId)
    }
    else {
      detachDebuggerFromTab(tabId)
    }
  }
})

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener(detachDebuggerFromTab)

// helper to wrap sendCommand in a Promise
function sendCommandAsync(
  debuggee: chrome.debugger.Debuggee,
  method: string,
  params: Record<string, any>
): Promise<any> {
  return new Promise((resolve) => {
    chrome.debugger.sendCommand(debuggee, method, params, resolve)
  })
}

// recursively fetch all props of a remote objectId
async function resolveRemoteObject(
  debuggee: chrome.debugger.Debuggee,
  objectId: string,
  seen: Set<string>,
  depth: number
): Promise<any> {
  // prevent infinite cycles or too‐deep nesting
  if (depth > 5 || seen.has(objectId)) {
    return '[Object]'
  }
  seen.add(objectId)

  // pull all own properties
  const reply = await sendCommandAsync(debuggee, 'Runtime.getProperties', {
    objectId,
    ownProperties: true,
    accessorPropertiesOnly: false,
    generatePreview: false
  })

  const result: Record<string, any> = {}

  for (const prop of reply.result) {
    const name = prop.name
    const val = prop.value

    if (!val) {
      // property has no value (e.g. accessor without getter)
      result[name] = undefined
    }
    else if (val.objectId && val.type === 'object') {
      // nested object → recurse
      result[name] = await resolveRemoteObject(
        debuggee,
        val.objectId,
        seen,
        depth + 1
      )
    }
    else {
      // primitive or function → use its value or description
      result[name] = val.value != null
        ? val.value
        : val.description
    }
  }

  return result
}

// Listen for debugger events across all attached tabs

chrome.debugger.onEvent.addListener(async (debuggee, method, params: any) => {
  const tabId = debuggee.tabId
  if (typeof tabId !== 'number') {
    return
  }

  if (method === 'Runtime.consoleAPICalled' || method === 'Runtime.exceptionThrown') {
    const p = params
    const rawArgs = p.args as Array<{
      objectId?: string
      type: string
      value?: any
      description?: string
    }>

    // resolve each argument, recursing into objects
    const handledArgs = await Promise.all(
      rawArgs.map(async (arg) => {
        if (arg.objectId && arg.type === 'object') {
          // start recursion with a fresh seen-set
          return await resolveRemoteObject(
            debuggee,
            arg.objectId,
            new Set(),
            0
          )
        }
        // primitive or already serializable
        return arg.value != null
          ? arg.value
          : arg.description
      })
    )

    // build a single string message
    const message = handledArgs
      .map((a) => typeof a === 'object' ? JSON.stringify(a) : String(a))
      .join(' ')

    // send it off
    chrome.tabs.get(tabId, (tab) => {
      const url = (!chrome.runtime.lastError && tab.url) ? tab.url : undefined
      const payload: LogPayload = {
        tabId,
        timestamp: Date.now(),
        method,
        type: p.type,
        message,
        url
      }
      sendLogToServer(payload)
    })
  }
})
