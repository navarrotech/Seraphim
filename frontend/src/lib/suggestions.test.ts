import { describe, it, expect } from 'vitest'

import type { AggregatedSuggestion } from './types'
import {
  flattenGroupedSuggestionIds,
  groupSuggestionsByRepoAndTask,
  repoGroupLabel,
  taskBadgeLabel
} from './suggestions'

// A minimal suggestion for the grouping tests; only the fields grouping reads
// need to be realistic, the rest carry harmless defaults.
function suggestion(overrides: Partial<AggregatedSuggestion>): AggregatedSuggestion {
  return {
    id: 'suggestion-1',
    task_id: 'task-1',
    title: 'A suggestion',
    detail: '',
    kind: 'follow_up',
    acknowledged: false,
    created_at: '2026-06-16T01:00:00.000Z',
    acknowledged_at: null,
    task_title: 'Task one',
    task_source: 'github',
    task_repo_linked: true,
    repo_full_name: 'JalapenoLabs/crew',
    task_external_id: '1',
    task_url: 'https://github.com/JalapenoLabs/crew/issues/1',
    ...overrides
  }
}

describe('groupSuggestionsByRepoAndTask', () => {
  it('groups by repo, then by task, preserving input order', () => {
    const suggestions: AggregatedSuggestion[] = [
      suggestion({ id: 'a', repo_full_name: 'org/one', task_id: 't1' }),
      suggestion({ id: 'b', repo_full_name: 'org/one', task_id: 't1' }),
      suggestion({ id: 'c', repo_full_name: 'org/one', task_id: 't2' }),
      suggestion({ id: 'd', repo_full_name: 'org/two', task_id: 't3' })
    ]

    const groups = groupSuggestionsByRepoAndTask(suggestions)

    expect(groups.map((group) => group.repoFullName)).toEqual(['org/one', 'org/two'])
    expect(groups[0].tasks.map((task) => task.taskId)).toEqual(['t1', 't2'])
    expect(groups[0].tasks[0].suggestions.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(groups[0].tasks[1].suggestions.map((entry) => entry.id)).toEqual(['c'])
    expect(groups[1].tasks[0].suggestions.map((entry) => entry.id)).toEqual(['d'])
  })

  it('moves the unlinked-repo bucket to the end', () => {
    const suggestions: AggregatedSuggestion[] = [
      suggestion({ id: 'a', repo_full_name: null, task_id: 't1' }),
      suggestion({ id: 'b', repo_full_name: 'org/one', task_id: 't2' })
    ]

    const groups = groupSuggestionsByRepoAndTask(suggestions)

    expect(groups.map((group) => group.repoFullName)).toEqual(['org/one', null])
  })

  it('keeps two tasks with the same title but different repos separate', () => {
    const suggestions: AggregatedSuggestion[] = [
      suggestion({ id: 'a', repo_full_name: 'org/one', task_id: 't1', task_title: 'Same' }),
      suggestion({ id: 'b', repo_full_name: 'org/two', task_id: 't2', task_title: 'Same' })
    ]

    const groups = groupSuggestionsByRepoAndTask(suggestions)

    expect(groups).toHaveLength(2)
    expect(groups[0].tasks).toHaveLength(1)
    expect(groups[1].tasks).toHaveLength(1)
  })
})

describe('flattenGroupedSuggestionIds', () => {
  it('lists ids in render order across every group, for range selection', () => {
    const suggestions: AggregatedSuggestion[] = [
      suggestion({ id: 'a', repo_full_name: 'org/one', task_id: 't1' }),
      suggestion({ id: 'b', repo_full_name: 'org/one', task_id: 't2' }),
      suggestion({ id: 'c', repo_full_name: null, task_id: 't3' })
    ]

    const ordered = flattenGroupedSuggestionIds(groupSuggestionsByRepoAndTask(suggestions))

    // 'c' is unlinked so its group sorts last, even though it came in second-to-none.
    expect(ordered).toEqual(['a', 'b', 'c'])
  })
})

describe('repoGroupLabel', () => {
  it('names the repo, or a clear fallback for the unlinked bucket', () => {
    expect(repoGroupLabel('JalapenoLabs/crew')).toBe('JalapenoLabs/crew')
    expect(repoGroupLabel(null)).toBe('No repository')
  })
})

describe('taskBadgeLabel', () => {
  it('prefixes a numeric GitHub issue with #, and shows other refs verbatim', () => {
    expect(taskBadgeLabel('364', 'github')).toBe('#364')
    expect(taskBadgeLabel('PROJ-12', 'jira')).toBe('PROJ-12')
    expect(taskBadgeLabel('abc123', 'github')).toBe('abc123')
  })
})
