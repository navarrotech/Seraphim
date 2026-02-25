// Copyright © 2026 Jalapeno Labs

// Trailing slash doesn't matter.
// Dot segments don't matter.
// Double slashes is fine.
// Disallow: <>:"\|?*
export const validAbsoluteLinuxFilePathRegex = /^(?:\/[^\0<>:"\\|?*]*|)$/u

// At least one '=' that is NOT inside single or double quotes
export const dotEnvEntryRegex = /=(?=(?:[^"']|"[^"]*"|'[^']*')*$)/
