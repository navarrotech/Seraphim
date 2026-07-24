<script lang="ts">
  // The Suggestions hub (issue #324, reworked in #364): every recommendation the
  // agent has made, across every task. Grouped by repository and then by the task
  // that raised them, so the operator can tell at a glance what a suggestion
  // belongs to. Each suggestion is a card with the title leading, a create-issue /
  // mark-complete dropdown, and an expandable clamped description. Rows multi-select
  // (with shift-click range) for bulk mark-complete / reopen, like the kanban board.
  import type { AggregatedSuggestion, EnvSuggestion } from '$lib/types'
  import type { SuggestionRepoGroup, SuggestionTaskGroup } from '$lib/suggestions'

  import { onMount, onDestroy } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import { acknowledgeSuggestion, listAllSuggestions } from '$lib/api'
  import {
    flattenGroupedSuggestionIds,
    groupSuggestionsByRepoAndTask,
    repoGroupLabel,
    taskBadgeLabel
  } from '$lib/suggestions'
  import { Badge } from '$lib/components/ui/badge'
  import SuggestionBulkBar from '$lib/components/SuggestionBulkBar.svelte'
  import SuggestionCard from '$lib/components/SuggestionCard.svelte'

  let suggestions = $state<AggregatedSuggestion[]>([])
  let loading = $state(true)
  let eventSource: EventSource | null = null

  // Open recommendations first (newest first), the done ones in their own section
  // (most recently done first). Acting on a row flips `acknowledged`, which moves it
  // between the two derived lists automatically.
  const open = $derived(
    suggestions
      .filter((suggestion) => !suggestion.acknowledged)
      .sort((first, second) => second.created_at.localeCompare(first.created_at))
  )
  const done = $derived(
    suggestions
      .filter((suggestion) => suggestion.acknowledged)
      .sort((first, second) =>
        (second.acknowledged_at ?? second.created_at).localeCompare(
          first.acknowledged_at ?? first.created_at
        )
      )
  )

  const openGroups = $derived(groupSuggestionsByRepoAndTask(open))
  const doneGroups = $derived(groupSuggestionsByRepoAndTask(done))

  // The full render order (open, then done), so a shift-click resolves a range that
  // may span task and repo groups.
  const orderedIds = $derived([
    ...flattenGroupedSuggestionIds(openGroups),
    ...flattenGroupedSuggestionIds(doneGroups)
  ])

  // --- Multi-select (issue #364) ---------------------------------------------
  let selected = new SvelteSet<string>()
  // The last row toggled on, the anchor a shift-click extends a range from.
  let anchorId = $state<string | null>(null)

  function select(id: string, event: MouseEvent) {
    if (event.shiftKey && anchorId && orderedIds.includes(anchorId) && orderedIds.includes(id)) {
      // Range select: fill in every row between the anchor and this one, inclusive.
      const anchorIndex = orderedIds.indexOf(anchorId)
      const clickedIndex = orderedIds.indexOf(id)
      const low = Math.min(anchorIndex, clickedIndex)
      const high = Math.max(anchorIndex, clickedIndex)
      for (let index = low; index <= high; index += 1) {
        selected.add(orderedIds[index])
      }
      return
    }
    if (selected.has(id)) {
      selected.delete(id)
    } else {
      selected.add(id)
    }
    anchorId = id
  }

  function clearSelection() {
    selected.clear()
    anchorId = null
  }

  async function bulkAcknowledge(next: boolean) {
    const ids = [...selected]
    if (ids.length === 0) {
      return
    }
    // Optimistically flip every selected row, then persist. On any failure, resync
    // from the server so the UI never lies about what was actually saved.
    const stamp = next ? new Date().toISOString() : null
    for (const id of ids) {
      const match = suggestions.find((suggestion) => suggestion.id === id)
      if (match) {
        match.acknowledged = next
        match.acknowledged_at = stamp
      }
    }
    clearSelection()
    const results = await Promise.allSettled(
      ids.map((id) => acknowledgeSuggestion(id, next))
    )
    if (results.some((result) => result.status === 'rejected')) {
      console.debug('some bulk acknowledgements failed, reloading', results)
      await load()
    }
  }

  async function load() {
    try {
      suggestions = await listAllSuggestions()
      // Drop any selection that no longer exists (acted on elsewhere, or deleted).
      const present = new Set(suggestions.map((suggestion) => suggestion.id))
      for (const id of selected) {
        if (!present.has(id)) {
          selected.delete(id)
        }
      }
    } catch (error) {
      console.debug('failed to load suggestions', error)
    } finally {
      loading = false
    }
  }

  async function toggle(id: string, next: boolean) {
    // Optimistically flip so the action feels instant, then persist; revert on
    // failure so the UI never lies about what was actually saved.
    const match = suggestions.find((suggestion) => suggestion.id === id)
    if (!match) {
      console.debug('toggle called for an unknown suggestion', id)
      return
    }
    match.acknowledged = next
    match.acknowledged_at = next ? new Date().toISOString() : null
    try {
      await acknowledgeSuggestion(id, next)
    } catch (error) {
      console.debug('failed to update suggestion, reverting', error)
      match.acknowledged = !next
      match.acknowledged_at = !next ? new Date().toISOString() : null
    }
  }

  // The create-issue button marks the suggestion done on the server; reflect that
  // locally so the row drops to the done section without waiting for a refetch.
  function onCreated(updated: EnvSuggestion) {
    const match = suggestions.find((suggestion) => suggestion.id === updated.id)
    if (match) {
      match.acknowledged = true
      match.acknowledged_at = updated.acknowledged_at
    }
  }

  onMount(() => {
    load()
    // Every suggestion action calls notify_board on the server, and the agent posts
    // new ones as it works, so refetch on each board tick to stay current.
    eventSource = new EventSource('/api/v1/board/stream')
    eventSource.addEventListener('board', () => load())
  })

  onDestroy(() => eventSource?.close())
</script>

{#snippet taskGroupBlock(taskGroup: SuggestionTaskGroup)}
  <div class="flex flex-col gap-1.5">
    <!-- The originating task: a clickable issue badge plus its full name, so the
         suggestion's origin is unambiguous and never clipped. -->
    <a
      href={`/task/${taskGroup.taskId}`}
      class="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <Badge variant="secondary" class="flex-none tabular-nums group-hover:bg-secondary/80">
        {taskBadgeLabel(taskGroup.taskExternalId, taskGroup.taskSource)}
      </Badge>
      <span class="truncate group-hover:underline">{taskGroup.taskTitle}</span>
    </a>
    <!-- The task's suggestions, boxed together. -->
    <div class="flex flex-col gap-2">
      {#each taskGroup.suggestions as suggestion (suggestion.id)}
        <SuggestionCard
          {suggestion}
          selected={selected.has(suggestion.id)}
          onselect={(event) => select(suggestion.id, event)}
          onacknowledge={(next) => toggle(suggestion.id, next)}
          oncreated={onCreated}
        />
      {/each}
    </div>
  </div>
{/snippet}

{#snippet repoGroups(groups: SuggestionRepoGroup[])}
  {#each groups as repoGroup (repoGroup.repoFullName ?? '__none__')}
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold tracking-tight">
        {repoGroupLabel(repoGroup.repoFullName)}
      </h3>
      {#each repoGroup.tasks as taskGroup (taskGroup.taskId)}
        {@render taskGroupBlock(taskGroup)}
      {/each}
    </div>
  {/each}
{/snippet}

<div class="mx-auto flex max-w-3xl flex-col gap-4 p-6 pb-24">
  <header>
    <h1 class="text-xl font-bold tracking-tight">Suggestions</h1>
    <p class="mt-0.5 text-sm text-muted-foreground">
      Every recommendation the agent has made across all tasks, grouped by repo and the task that
      raised it. Select rows to act on them in bulk, one-click one into a tracked issue, or mark it
      complete once you have handled it.
    </p>
  </header>

  {#if loading}
    <p class="text-sm text-muted-foreground">Loading…</p>
  {:else if suggestions.length === 0}
    <p class="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      No suggestions yet. The agent records environment tips and follow-up work as it runs.
    </p>
  {:else}
    <section class="flex flex-col gap-6 rounded-lg border border-warning/50 bg-card/40 p-4">
      <h2 class="text-sm font-semibold">Open ({open.length})</h2>
      {#if open.length === 0}
        <p class="text-xs text-muted-foreground">Nothing open. Everything has been handled.</p>
      {:else}
        {@render repoGroups(openGroups)}
      {/if}
    </section>

    {#if done.length}
      <section class="flex flex-col gap-6 rounded-lg border border-border bg-card/40 p-4 opacity-80">
        <h2 class="text-sm font-semibold text-muted-foreground">Done ({done.length})</h2>
        {@render repoGroups(doneGroups)}
      </section>
    {/if}
  {/if}
</div>

{#if selected.size > 0}
  <SuggestionBulkBar
    count={selected.size}
    onMarkComplete={() => bulkAcknowledge(true)}
    onReopen={() => bulkAcknowledge(false)}
    onClear={clearSelection}
  />
{/if}
