<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { LucideIcon } from '@lucide/svelte'
  import type { AlertVariant } from './ui/alert'

  import { X } from '@lucide/svelte'

  import { cn } from '$lib/utils.js'
  import * as Alert from './ui/alert'
  import { Button } from './ui/button'

  // The shared chrome for the board's alert banners (issue #376): the inset,
  // full-width container, the title row (optional leading icon and trailing badge),
  // and the standard dismiss button. Each banner supplies only its own icon, title,
  // and description body, so the layout and inset live in one place. A container fix
  // (e.g. the mx-6 overflow, issue #349) then reaches every banner at once instead
  // of drifting to some and not others.
  let {
    variant = 'default',
    icon,
    title,
    align = 'start',
    dismiss,
    dismissLabel,
    titleBadge,
    action,
    children,
    class: className
  }: {
    variant?: AlertVariant
    // Optional leading icon for the title row.
    icon?: LucideIcon
    title: string
    // How the body and the trailing button align across the pill's height. Banners
    // with multi-line bodies use `start`; a short single-line banner uses `center`.
    align?: 'start' | 'center'
    // A dismiss handler renders the standard outline X button; pair it with the
    // accessible label naming what is dismissed. Leave unset for a banner that acts
    // through `action` instead.
    dismiss?: () => void
    dismissLabel?: string
    // Optional trailing content in the title row, e.g. the heart-attack railway tag.
    titleBadge?: Snippet
    // A custom trailing control (e.g. Retry, Resume now) for banners that act rather
    // than dismiss. Ignored when `dismiss` is set.
    action?: Snippet
    // The banner's description body (an `Alert.Description`, whose own classes vary
    // per banner, so it stays with the caller).
    children: Snippet
    class?: string
  } = $props()
</script>

<Alert.Root
  {variant}
  class={cn(
    'mx-6 mt-4 flex w-auto justify-between gap-4',
    align === 'center' ? 'items-center' : 'items-start',
    className
  )}
>
  <div class="min-w-0">
    {#if icon || titleBadge}
      {@const TitleIcon = icon}
      <Alert.Title class="flex items-center gap-1.5">
        {#if TitleIcon}
          <TitleIcon class="size-4 flex-none" />
        {/if}
        {title}
        {#if titleBadge}
          {@render titleBadge()}
        {/if}
      </Alert.Title>
    {:else}
      <Alert.Title>{title}</Alert.Title>
    {/if}
    {@render children()}
  </div>

  {#if dismiss}
    <Button
      variant="outline"
      size="icon"
      class="flex-none"
      title="Dismiss"
      aria-label={dismissLabel}
      onclick={dismiss}
    >
      <X class="size-4" />
    </Button>
  {:else if action}
    {@render action()}
  {/if}
</Alert.Root>
