<script lang="ts">
  // A floating bottom bar for the Suggestions page multi-select (issue #364),
  // mirroring the board's BulkActionBar. The two bulk actions a suggestion
  // supports are marking a batch complete and reopening it; both are reversible,
  // so neither needs a confirmation modal.
  import { Check, RotateCcw, X } from '@lucide/svelte'

  import { Badge } from './ui/badge'
  import { Button } from './ui/button'

  let {
    count,
    onMarkComplete,
    onReopen,
    onClear
  }: {
    count: number
    onMarkComplete: () => Promise<void>
    onReopen: () => Promise<void>
    onClear: () => void
  } = $props()

  let busy = $state(false)
  const noneSelected = $derived(count === 0)

  async function run(action: () => Promise<void>) {
    busy = true
    try {
      await action()
    } finally {
      busy = false
    }
  }
</script>

<!-- Capped at the viewport width and wrapping below sm, matching BulkActionBar so
     it stays usable on a 375px screen. -->
<div
  class="fixed bottom-6 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-2xl sm:w-auto sm:flex-nowrap"
  role="toolbar"
  aria-label="Bulk suggestion actions"
>
  <div class="flex items-center gap-2 pl-1 pr-1">
    <Badge variant="default" class="tabular-nums">{count}</Badge>
    <span class="hidden text-sm text-muted-foreground sm:inline">selected</span>
  </div>

  <div class="mx-1 h-6 w-px bg-border" aria-hidden="true"></div>

  <Button variant="ghost" size="sm" disabled={noneSelected || busy} onclick={() => run(onMarkComplete)}>
    <Check class="size-4" />
    Mark complete
  </Button>

  <Button variant="ghost" size="sm" disabled={noneSelected || busy} onclick={() => run(onReopen)}>
    <RotateCcw class="size-4" />
    Reopen
  </Button>

  <div class="mx-1 h-6 w-px bg-border" aria-hidden="true"></div>

  <Button
    variant="ghost"
    size="icon"
    title="Clear selection"
    aria-label="Clear selection and exit multi-select"
    onclick={onClear}
  >
    <X class="size-4" />
  </Button>
</div>
