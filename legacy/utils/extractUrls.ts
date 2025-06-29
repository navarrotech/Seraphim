// Copyright © 2025 Jalapeno Labs

export function extractUrls(errorMessage: string): string[] {
  // Match “http://…” or “https://…” up to the first whitespace or closing parenthesis
  const urlRegex = /https?:\/\/[^\s)]+/g

  // String.match returns string[] or null
  const urls = errorMessage.match(urlRegex) || []

  return urls
}
