// Copyright © 2026 Jalapeno Labs

export type SearchQueryInput = {
  q?: string | null
  search?: string | null
}

export function resolveSearchQuery(query: SearchQueryInput): string | null {
  const searchQuery = query.q ?? query.search ?? ''
  const trimmed = searchQuery.trim()

  if (!trimmed) {
    return null
  }

  return trimmed
}
