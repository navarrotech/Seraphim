// Copyright © 2026 Jalapeno Labs

/**
 * Builds a Tailwind-style color scale from a base hex color by mixing toward
 * white for lighter shades and black for darker shades.
 *
 * @param {string} hex Base color in 6-digit hex format, with or without `#`
 * @returns {{ [shade: string]: string }} Shade map with keys 50-950 in uppercase hex
 */
export function generateTailwindScale(hex) {
  hex = hex[0] === '#' ? hex.slice(1) : hex

  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  const shades = {
    50: [ 255, 0.9 ],
    100: [ 255, 0.75 ],
    200: [ 255, 0.6 ],
    300: [ 255, 0.45 ],
    400: [ 255, 0.25 ],
    500: null, // base
    600: [ 0, 0.1 ],
    700: [ 0, 0.25 ],
    800: [ 0, 0.4 ],
    900: [ 0, 0.55 ],
    950: [ 0, 0.7 ],
  }

  const toHex = (n) => n.toString(16).padStart(2, '0')

  // The only place hex string formatting happens
  const makeHex = (rr, gg, bb) =>
    ('#' + toHex(rr) + toHex(gg) + toHex(bb)).toUpperCase()

  const mixChannel = (base, target, weight) =>
    Math.round(base + (target - base) * weight)

  const out = {}

  for (const key in shades) {
    const spec = shades[key]

    if (spec === null) {
      out[key] = makeHex(r, g, b)
      continue
    }

    const target = spec[0]
    const weight = spec[1]

    out[key] = makeHex(
      mixChannel(r, target, weight),
      mixChannel(g, target, weight),
      mixChannel(b, target, weight),
    )
  }

  return out
}
