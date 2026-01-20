// Copyright © 2026 Jalapeno Labs

export const IPC_SIGNALS = {
  reduxGetState: 'redux:getState',
  reduxDispatch: 'redux:dispatch',
  reduxStateChanged: 'redux:stateChanged',
} as const

export const devCsp: string[] = [
  // everything from our own origin…
  'default-src \'self\'',
  // …but load & run scripts (including inline & eval’d HMR code) from localhost:5173
  'script-src \'self\' http://localhost:5173 \'unsafe-inline\'',
  // styles (including inline HMR style updates) from localhost:5173
  'style-src \'self\' http://localhost:5173 https://fonts.googleapis.com \'unsafe-inline\'',
  // Fonts
  'font-src \'self\' https://fonts.gstatic.com data:',
  // images from localhost:5173 and data URIs
  'img-src \'self\' http://localhost:5173 data:',
  // HMR websocket & XHR
  'connect-src \'self\' http://localhost:5173 ws://localhost:5173',
]

export const prodCsp: string[] = [
  // lock everything down to your custom protocol
  'default-src \'self\' app://electron',
  // only run bundled scripts
  'script-src \'self\' app://electron \'unsafe-inline\'',
  // allow inline styles (for bundled styles) (unsafe inline needed for Monaco editor styles)
  'style-src \'self\' app://electron https://fonts.googleapis.com \'unsafe-inline\'',
  // Fonts
  'font-src \'self\' https://fonts.gstatic.com data:',
  // images via protocol or data URIs
  'img-src \'self\' app://electron data:',
]
