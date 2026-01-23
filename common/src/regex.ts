// Copyright © 2026 Jalapeno Labs

// Trailing slash doesn't matter.
// Dot segments don't matter.
// Double slashes is fine.
// Disallow: <>:"\|?*
export const validAbsoluteLinuxFilePathRegex = /^(?:\/[^\0<>:"\\|?*]*|)$/u
