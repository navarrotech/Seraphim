// Grouping for the Suggestions page (issue #364): the aggregated list is grouped
// by repository, then by the originating task, so the operator can see at a glance
// which repo a suggestion belongs to and which issue kicked it off. The flatten
// helper produces the display-order list the page uses to resolve shift-click
// range selection. Pure logic, unit-tested; the page renders the result.
import type { AggregatedSuggestion, SourceKind } from './types'

// The suggestions raised while working one task, kept in their incoming order.
export type SuggestionTaskGroup = {
  taskId: string
  taskTitle: string
  taskExternalId: string
  taskUrl: string
  taskSource: SourceKind
  suggestions: AggregatedSuggestion[]
}

// One repository's tasks. `repoFullName` is `null` for suggestions whose task has
// no linked repo; that bucket sorts last under a "No repository" heading.
export type SuggestionRepoGroup = {
  repoFullName: string | null
  tasks: SuggestionTaskGroup[]
}

// Groups suggestions by repo, then by task, preserving the input order within and
// between groups (the page sorts newest-first before calling this, so the newest
// suggestion's repo and task lead). The unlinked-repo bucket is moved to the end,
// since it is the catch-all rather than a real repository.
export function groupSuggestionsByRepoAndTask(
  suggestions: AggregatedSuggestion[]
): SuggestionRepoGroup[] {
  const repoGroups: SuggestionRepoGroup[] = []
  const repoIndexByName = new Map<string, number>()
  // A task belongs to exactly one repo, so its id alone locates its task group.
  const taskIndexById = new Map<string, number>()

  for (const suggestion of suggestions) {
    const repoKey = suggestion.repo_full_name ?? ''
    let repoIndex = repoIndexByName.get(repoKey)
    if (repoIndex === undefined) {
      repoIndex = repoGroups.length
      repoIndexByName.set(repoKey, repoIndex)
      repoGroups.push({ repoFullName: suggestion.repo_full_name, tasks: [] })
    }
    const repoGroup = repoGroups[repoIndex]

    let taskIndex = taskIndexById.get(suggestion.task_id)
    if (taskIndex === undefined) {
      taskIndex = repoGroup.tasks.length
      taskIndexById.set(suggestion.task_id, taskIndex)
      repoGroup.tasks.push({
        taskId: suggestion.task_id,
        taskTitle: suggestion.task_title,
        taskExternalId: suggestion.task_external_id,
        taskUrl: suggestion.task_url,
        taskSource: suggestion.task_source,
        suggestions: []
      })
    }
    repoGroup.tasks[taskIndex].suggestions.push(suggestion)
  }

  // The catch-all "no repository" bucket sorts last; real repos keep their order.
  return repoGroups.sort((first, second) => {
    if (first.repoFullName === null) {
      return 1
    }
    if (second.repoFullName === null) {
      return -1
    }
    return 0
  })
}

// The suggestion ids in the exact order they render, so a shift-click can resolve
// the contiguous range between the anchor and the clicked row across every group.
export function flattenGroupedSuggestionIds(groups: SuggestionRepoGroup[]): string[] {
  const ids: string[] = []
  for (const repoGroup of groups) {
    for (const taskGroup of repoGroup.tasks) {
      for (const suggestion of taskGroup.suggestions) {
        ids.push(suggestion.id)
      }
    }
  }
  return ids
}

// A short, human label for a repo group heading: the repo name, or a clear
// fallback for the unlinked bucket.
export function repoGroupLabel(repoFullName: string | null): string {
  return repoFullName ?? 'No repository'
}

// Formats a task's issue reference as a compact badge label: GitHub issue numbers
// read as `#123`, while Jira keys and internal ids are shown verbatim.
export function taskBadgeLabel(externalId: string, source: SourceKind): string {
  if (source === 'github' && /^\d+$/.test(externalId)) {
    return `#${externalId}`
  }
  return externalId
}
