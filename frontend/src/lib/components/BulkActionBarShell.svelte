<script lang="ts">
  import type { Snippet } from 'svelte'

  import { X } from '@lucide/svelte'

  import { Badge } from './ui/badge'
  import { Button } from './ui/button'

  // The shared floating-pill chrome for the app's multi-select bulk-action bars
  // (issue #375): the fixed, mobile-safe container, the count badge and "selected"
  // label, the dividers, and the exit button. Each bar renders only its own action
  // buttons into `actions`, so the container, sizing, and mobile behavior live in
  // exactly one place and cannot drift apart again (the divergence issue #350 had
  // to fix by hand, when the mobile treatment reached one bar but not the other).
  let {
    count,
    onClear,
    ariaLabel,
    actions
  }: {
    count: number
    onClear: () => void
    // The toolbar's accessible name, e.g. "Bulk actions".
    ariaLabel: string
    // The bar's action buttons, rendered between the count and the exit button.
    actions: Snippet
  } = $props()
</script>

<!-- Mobile-safe (issues #331, #350): the pill is capped at the viewport width and,
     below sm, takes the full capped width and wraps its actions onto multiple rows,
     reverting to a single auto-width row from sm up. Sharing it here keeps every
     bar's chrome identical no matter how many actions it holds. -->
<div
  class="fixed bottom-6 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-2xl sm:w-auto sm:flex-nowrap"
  role="toolbar"
  aria-label={ariaLabel}
>
  <!-- Far left: count badge + the word "selected" (label drops on narrow screens
       so the compact bar stays within a 375px viewport). -->
  <div class="flex items-center gap-2 pl-1 pr-1">
    <Badge variant="default" class="tabular-nums">{count}</Badge>
    <span class="hidden text-sm text-muted-foreground sm:inline">selected</span>
  </div>

  <div class="mx-1 h-6 w-px bg-border" aria-hidden="true"></div>

  <!-- Middle: each bar's own actions. -->
  {@render actions()}

  <div class="mx-1 h-6 w-px bg-border" aria-hidden="true"></div>

  <!-- Far right: clear selection and exit. -->
  <Button
    variant="ghost"
    size="icon"
    title="Clear all"
    aria-label="Clear all and exit multi-select"
    onclick={onClear}
  >
    <X class="size-4" />
  </Button>
</div>
