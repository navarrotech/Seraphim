<script lang="ts">
  import type { ReposDeletionImpact, TaskColumn } from '$lib/types'
  import type { BulkSortKey } from '$lib/api'

  // Core
  import { dev } from '$app/environment'
  import { SvelteSet } from 'svelte/reactivity'
  import { HeartPulse, Wrench, X } from '@lucide/svelte'

  // User interface
  import * as Alert from '$lib/components/ui/alert'
  import { Button } from '$lib/components/ui/button'

  import BulkActionBar from '$lib/components/BulkActionBar.svelte'
  import RepoBulkActionBar from '$lib/components/RepoBulkActionBar.svelte'
  import SuggestionBulkBar from '$lib/components/SuggestionBulkBar.svelte'

  // A dev-only gallery for the app's floating and conditional components (issue
  // #374). Several of them only appear in specific app states (bulk-select mode,
  // unacknowledged banners), so reviewing them in a browser otherwise means
  // seeding the backend or wiring a throwaway probe route. This renders them with
  // stub props at any width, so the visual self-review is fast and repeatable.
  //
  // Guarded to dev builds: `dev` is true only under `vite dev`, so a production
  // build renders nothing but the notice below.

  // The floating bulk bars are `position: fixed` to the bottom of the viewport, so
  // two on screen at once would overlap. Show one at a time, chosen here.
  type PreviewBar = 'none' | 'board' | 'repos' | 'suggestions'

  const BAR_OPTIONS: { id: PreviewBar; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'board', label: 'Board bulk bar' },
    { id: 'repos', label: 'Repositories bulk bar' },
    { id: 'suggestions', label: 'Suggestions bulk bar' }
  ]

  let activeBar = $state<PreviewBar>('board')

  // The bars key their label pluralization and disabled state off the selection
  // count, so make it adjustable to review count=0 (actions disabled) through many.
  let count = $state(3)

  // The two board/repo bars report whether one of their own modals is open; the
  // real pages read this to let Escape close the modal first. Bind it so the
  // preview mirrors that contract even though nothing here consumes it.
  let dialogOpen = $state(false)

  // Dismissible banners hide themselves once the operator has read them; track the
  // dismissed ones so the preview's dismiss buttons behave like the real board.
  const dismissedBanners = new SvelteSet<string>()

  // Stub handlers: the preview never touches the API, so each action just logs.
  async function logAction(action: string, detail?: unknown) {
    console.debug(`[component-preview] ${action}`, detail ?? '')
  }

  // A plausible blast-radius for the repositories delete confirmation, scaled off
  // the current selection so the modal reads like the real one.
  async function stubDeletionImpact(): Promise<ReposDeletionImpact> {
    return {
      repos: count,
      tasks: count * 4,
      turns: count * 11,
      events: count * 38,
      questions: count * 2,
      suggestions: count * 3
    }
  }
</script>

{#if !dev}
  <div class="mx-auto max-w-2xl p-6">
    <Alert.Root>
      <Alert.Title>Component preview is available in development only</Alert.Title>
      <Alert.Description>
        This gallery is a dev-build tool. Run the UI with <code>yarn dev</code> to use it.
      </Alert.Description>
    </Alert.Root>
  </div>
{:else}
  <div class="mx-auto max-w-3xl space-y-8 p-6">
    <header class="space-y-1">
      <h1 class="text-xl font-bold tracking-tight">Component preview</h1>
      <p class="text-sm text-muted-foreground">
        A dev-only gallery for the floating and conditional components that only appear in specific
        app states. Resize the viewport to 375px and 1280px to check both breakpoints.
      </p>
    </header>

    <!-- Bulk action bars: floating bottom toolbars for each page's multi-select
         mode. Only one shows at a time (they share the same fixed position). -->
    <section class="space-y-3">
      <h2 class="text-sm font-semibold">Bulk action bars</h2>

      <div class="flex flex-wrap items-center gap-2">
        {#each BAR_OPTIONS as option (option.id)}
          <Button
            variant={activeBar === option.id ? 'default' : 'outline'}
            size="sm"
            onclick={() => (activeBar = option.id)}
          >
            {option.label}
          </Button>
        {/each}
      </div>

      <label class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">Selected count</span>
        <input
          type="number"
          min="0"
          bind:value={count}
          class="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>
      <p class="text-xs text-muted-foreground">
        The selected bar floats at the bottom of the viewport. A count of 0 disables its actions.
      </p>
    </section>

    <!-- Board banners: alerts that appear at the top of the kanban board only in
         specific states (a heart attack, a setup-script change). These are
         representative fixtures that mirror the board's markup; the live banners
         are still wired inline in `routes/+page.svelte`. -->
    <section class="space-y-3">
      <h2 class="text-sm font-semibold">Board banners</h2>

      {#if !dismissedBanners.has('heart-attack')}
        <!-- Destructive variant: a turn died and the defibrillator recovered it. -->
        <Alert.Root variant="destructive" class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <Alert.Title class="flex items-center gap-1.5">
              <HeartPulse class="size-4 flex-none" />
              Agent heart attack: "Add rate limiting to the public API"
            </Alert.Title>
            <Alert.Description class="break-words">
              <span class="font-mono text-xs break-words">
                Turn ended: no output for 20m (heartbeat timed out).
              </span>
              <span class="mt-1 block text-xs opacity-80">
                Requeued to To Do (recovery attempt 1 of 3).
              </span>
            </Alert.Description>
          </div>
          <Button
            variant="outline"
            size="icon"
            class="flex-none"
            title="Dismiss"
            aria-label="Dismiss heart attack"
            onclick={() => dismissedBanners.add('heart-attack')}
          >
            <X class="size-4" />
          </Button>
        </Alert.Root>
      {/if}

      {#if !dismissedBanners.has('setup-change')}
        <!-- Informational variant (primary accent, not destructive): the agent
             edited one of its own setup scripts. -->
        <Alert.Root class="flex items-start justify-between gap-4 border-primary/40">
          <div class="min-w-0">
            <Alert.Title class="flex items-center gap-1.5">
              <Wrench class="size-4 flex-none" />
              Agent updated the setup script: environment setup
            </Alert.Title>
            <Alert.Description class="break-words">
              <span class="block">
                Added "cd frontend && yarn install" so UI tasks build immediately.
              </span>
            </Alert.Description>
          </div>
          <Button variant="outline" size="sm" onclick={() => dismissedBanners.add('setup-change')}>
            Dismiss
          </Button>
        </Alert.Root>
      {/if}

      {#if dismissedBanners.has('heart-attack') && dismissedBanners.has('setup-change')}
        <p class="text-xs text-muted-foreground">
          Both banners dismissed.
          <button
            type="button"
            class="underline"
            onclick={() => dismissedBanners.clear()}
          >
            Reset
          </button>
        </p>
      {/if}
    </section>
  </div>

  <!-- The chosen floating bar, wired to stub handlers. -->
  {#if activeBar === 'board'}
    <BulkActionBar
      {count}
      bind:dialogOpen
      onClear={() => (activeBar = 'none')}
      onEditFields={(fields) => logAction('board onEditFields', fields)}
      onChangeStatus={(column: TaskColumn) => logAction('board onChangeStatus', column)}
      onSort={(sort: BulkSortKey) => logAction('board onSort', sort)}
      onDelete={() => logAction('board onDelete')}
    />
  {:else if activeBar === 'repos'}
    <RepoBulkActionBar
      {count}
      bind:dialogOpen
      onClear={() => (activeBar = 'none')}
      onEditFields={(fields) => logAction('repos onEditFields', fields)}
      onDelete={() => logAction('repos onDelete')}
      fetchImpact={stubDeletionImpact}
    />
  {:else if activeBar === 'suggestions'}
    <SuggestionBulkBar
      {count}
      onMarkComplete={() => logAction('suggestions onMarkComplete')}
      onReopen={() => logAction('suggestions onReopen')}
      onClear={() => (activeBar = 'none')}
    />
  {/if}
{/if}
