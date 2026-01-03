// Copyright © 2026 Jalapeno Labs

export const devCsp: string[] = [
  // everything from our own origin…
  'default-src \'self\'',
  // …but load & run scripts (including inline & eval’d HMR code) from localhost:5173
  'script-src \'self\' http://localhost:5173 \'unsafe-inline\'',
  // styles (including inline HMR style updates) from localhost:5173
  'style-src \'self\' http://localhost:5173 \'unsafe-inline\'',
  // images from localhost:5173 and data URIs
  'img-src \'self\' http://localhost:5173 data:',
  // HMR websocket & XHR
  'connect-src \'self\' http://localhost:5173 ws://localhost:5173',
]

export const prodCsp: string[] = [
  // lock everything down to your custom protocol
  'default-src \'self\' app://electron',
  // only run bundled scripts
  'script-src \'self\' app://electron',
  // only load bundled styles
  'style-src \'self\' app://electron',
  // images via protocol or data URIs
  'img-src \'self\' app://electron data:',
]
