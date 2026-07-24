<script lang="ts">
  // One suggestion on the Suggestions page (issue #364): a selection checkbox, the
  // title as the headline, the smart create-issue dropdown (which now also carries
  // the mark-complete action), a description clamped to three lines that expands on
  // click, and the small kind badge along the bottom. The title leads; the detail
  // stays out of the way until wanted.
  import type { AggregatedSuggestion, EnvSuggestion } from '$lib/types'

  import { ChevronRight } from '@lucide/svelte'

  import { Checkbox } from '$lib/components/ui/checkbox'
  import SuggestionCreateButton from './SuggestionCreateButton.svelte'

  let {
    suggestion,
    selected = false,
    onselect,
    onacknowledge,
    oncreated
  }: {
    suggestion: AggregatedSuggestion
    selected?: boolean
    // Carries the mouse event so the page can resolve a shift-click range select.
    onselect: (event: MouseEvent) => void
    onacknowledge: (next: boolean) => void
    oncreated: (updated: EnvSuggestion) => void
  } = $props()

  let expanded = $state(false)
  let detailElement = $state<HTMLParagraphElement>()
  // Whether the clamped detail actually overflows three lines. Measured only while
  // collapsed (when expanded, scrollHeight equals clientHeight), so the value stays
  // truthy through an expand and the toggle never flickers away mid-read.
  let overflowing = $state(false)

  $effect(() => {
    // Re-measure whenever the detail text changes or the row collapses again.
    void suggestion.detail
    if (!expanded && detailElement) {
      overflowing = detailElement.scrollHeight > detailElement.clientHeight + 1
    }
  })

  const canExpand = $derived(overflowing || expanded)

  function suppressShiftSelection(event: MouseEvent) {
    // Shift-clicking with a caret elsewhere would extend a text selection; stop it
    // so a range select stays a clean click.
    if (event.shiftKey) {
      event.preventDefault()
    }
  }
</script>

<div
  class="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors {selected
    ? 'border-primary ring-1 ring-primary/40'
    : 'border-border hover:border-border/80'} {suggestion.acknowledged ? 'opacity-70' : ''}"
>
  <!-- Selection checkbox: a button so the click carries the shiftKey for range
       selection; the Checkbox inside is purely visual. -->
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    aria-label={selected ? 'Deselect suggestion' : 'Select suggestion'}
    onmousedown={suppressShiftSelection}
    onclick={onselect}
    class="mt-0.5 flex-none cursor-pointer"
  >
    <Checkbox checked={selected} tabindex={-1} aria-hidden="true" class="pointer-events-none" />
  </button>

  <div class="flex min-w-0 flex-1 flex-col gap-1.5">
    <!-- Headline row: the title leads, the smart dropdown sits opposite it. -->
    <div class="flex items-start justify-between gap-3">
      <h4
        class="min-w-0 flex-1 text-sm font-semibold leading-snug {suggestion.acknowledged
          ? 'text-muted-foreground line-through'
          : 'text-foreground'}"
      >
        {suggestion.title}
      </h4>
      <SuggestionCreateButton
        {suggestion}
        source={suggestion.task_source}
        repoLinked={suggestion.task_repo_linked}
        acknowledged={suggestion.acknowledged}
        {oncreated}
        {onacknowledge}
      />
    </div>

    <!-- Description: clamped to three lines, click the chevron or the text to
         expand, but only when it actually overflows. -->
    {#if suggestion.detail}
      {#if canExpand}
        <button
          type="button"
          onclick={() => (expanded = !expanded)}
          aria-expanded={expanded}
          title={expanded ? 'Collapse' : 'Expand'}
          class="flex w-full items-start gap-1.5 text-left"
        >
          <ChevronRight
            class="mt-0.5 size-3.5 flex-none text-muted-foreground transition-transform {expanded
              ? 'rotate-90'
              : ''}"
          />
          <p
            bind:this={detailElement}
            class="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground {expanded
              ? ''
              : 'line-clamp-3'}"
          >
            {suggestion.detail}
          </p>
        </button>
      {:else}
        <p
          bind:this={detailElement}
          class="whitespace-pre-wrap break-words pl-5 text-xs leading-relaxed text-muted-foreground line-clamp-3"
        >
          {suggestion.detail}
        </p>
      {/if}
    {/if}

    <!-- Bottom badges: small, secondary. The kind badge stays as-is. -->
    <div class="flex flex-wrap items-center gap-2 pl-5">
      <span class="rounded border border-border px-1.5 py-0 text-[10px] text-muted-foreground">
        {suggestion.kind === 'follow_up' ? '🧹 Follow-up' : '💡 Environment'}
      </span>
    </div>
  </div>
</div>
