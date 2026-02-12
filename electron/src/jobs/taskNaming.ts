// Copyright © 2026 Jalapeno Labs

// only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed
export function toContainerName(taskName: string) {
  const base = taskName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const shortHash = `${Math.floor(Date.now() / 1000).toString(36)}`

  if (!base) {
    console.debug('Codex task name produced an empty container name', {
      taskName,
    })
    return `seraphim-task--${shortHash}`
  }

  const prefixed = `seraphim-${base}`
  if (prefixed.length <= 40) {
    return `${prefixed}--${shortHash}`
  }

  return prefixed.slice(0, 40).replace(/-+$/g, '') + `--${shortHash}`
}
