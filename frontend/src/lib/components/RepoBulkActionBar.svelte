<script lang="ts">
  import type { ReposDeletionImpact } from '$lib/types'

  import { SlidersHorizontal, Trash2 } from '@lucide/svelte'

  import { Button } from './ui/button'
  import * as AlertDialog from './ui/alert-dialog'

  import BulkActionBarShell from './BulkActionBarShell.svelte'

  // A floating bottom bar (Jira-style) for the repositories page's multi-select
  // mode, modeled on the board's BulkActionBar (issue #331). It owns its own
  // modals and reports whether any is open via `dialogOpen`, so the page can let
  // Escape close a modal first rather than exiting bulk mode.
  let {
    count,
    onClear,
    onEditFields,
    onDelete,
    fetchImpact,
    dialogOpen = $bindable(false)
  }: {
    count: number
    onClear: () => void
    onEditFields: (fields: { enabled?: boolean; sync_issues?: boolean }) => Promise<void>
    onDelete: () => Promise<void>
    // Loads the aggregate deletion impact for the current selection, called when
    // the delete confirmation opens so it can spell out the blast radius.
    fetchImpact: () => Promise<ReposDeletionImpact>
    dialogOpen?: boolean
  } = $props()

  // A three-way per-field choice in the Edit fields modal.
  type FieldChoice = 'keep' | 'true' | 'false'

  let editOpen = $state(false)
  let deleteOpen = $state(false)
  let busy = $state(false)

  let enabledChoice = $state<FieldChoice>('keep')
  let syncChoice = $state<FieldChoice>('keep')

  // The counts a delete would purge, loaded lazily when the modal opens (null
  // while loading), mirroring the single-repo delete confirmation.
  let impact = $state<ReposDeletionImpact | null>(null)

  // Let the page suppress its Escape-to-exit while one of our overlays is open.
  $effect(() => {
    dialogOpen = editOpen || deleteOpen
  })

  const noneSelected = $derived(count === 0)

  function openEdit() {
    enabledChoice = 'keep'
    syncChoice = 'keep'
    editOpen = true
  }

  function openDelete() {
    impact = null
    deleteOpen = true
    fetchImpact()
      .then((loaded) => {
        // Ignore a late response if the dialog has since closed.
        if (deleteOpen) {
          impact = loaded
        }
      })
      .catch((error) => console.debug('failed to load bulk deletion impact', error))
  }

  function choiceToBool(choice: FieldChoice): boolean | undefined {
    if (choice === 'keep') {
      return undefined
    }
    return choice === 'true'
  }

  async function saveEdit() {
    const fields: { enabled?: boolean; sync_issues?: boolean } = {}
    const enabled = choiceToBool(enabledChoice)
    const syncIssues = choiceToBool(syncChoice)
    if (enabled !== undefined) {
      fields.enabled = enabled
    }
    if (syncIssues !== undefined) {
      fields.sync_issues = syncIssues
    }
    // Nothing chosen: just close, don't hit the API for a no-op.
    if (fields.enabled === undefined && fields.sync_issues === undefined) {
      editOpen = false
      return
    }
    busy = true
    try {
      await onEditFields(fields)
      editOpen = false
    }
    finally {
      busy = false
    }
  }

  async function confirmDelete() {
    busy = true
    try {
      await onDelete()
      deleteOpen = false
    }
    finally {
      busy = false
    }
  }
</script>

<BulkActionBarShell {count} {onClear} ariaLabel="Bulk repository actions">
  {#snippet actions()}
    <Button variant="ghost" size="sm" disabled={noneSelected || busy} onclick={openEdit}>
      <SlidersHorizontal class="size-4" />
      Edit fields
    </Button>

    <Button
      variant="ghost"
      size="sm"
      class="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={noneSelected || busy}
      onclick={openDelete}
    >
      <Trash2 class="size-4" />
      Delete
    </Button>
  {/snippet}
</BulkActionBarShell>

<!-- Edit fields modal: one row per editable field, each a "keep as is / on / off"
     dropdown. Native selects render outside the dialog's focus scope, so they
     never fight the modal. -->
<AlertDialog.Root bind:open={editOpen}>
  <AlertDialog.Content class="sm:max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Edit fields</AlertDialog.Title>
      <AlertDialog.Description>
        Apply to {count} selected {count === 1 ? 'repository' : 'repositories'}. Leave a field on
        "Keep as is" to not change it.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="grid grid-cols-2 items-center gap-x-4 gap-y-3 py-2">
      <label for="bulk-repo-enabled" class="text-sm font-medium">Enabled</label>
      <select
        id="bulk-repo-enabled"
        bind:value={enabledChoice}
        class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="keep">Keep as is</option>
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>

      <label for="bulk-repo-sync" class="text-sm font-medium">Sync issues</label>
      <select
        id="bulk-repo-sync"
        bind:value={syncChoice}
        class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="keep">Keep as is</option>
        <option value="true">On</option>
        <option value="false">Off</option>
      </select>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={busy}>Cancel</AlertDialog.Cancel>
      <Button onclick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete confirmation, spelling out the aggregate impact across the selection. -->
<AlertDialog.Root bind:open={deleteOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        Delete {count} {count === 1 ? 'repository' : 'repositories'}?
      </AlertDialog.Title>
      <AlertDialog.Description>
        This permanently removes the selected {count === 1 ? 'repository' : 'repositories'} and
        everything synced from them. The source issues on GitHub/Jira are not affected. This cannot
        be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      {#if impact}
        <p class="mb-1 font-medium">This will also delete:</p>
        <ul class="list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>
            {impact.tasks}
            {impact.tasks === 1 ? 'task' : 'tasks'} (issues on the board)
          </li>
          <li>
            {impact.turns} agent {impact.turns === 1 ? 'turn' : 'turns'} with
            {impact.events} activity log {impact.events === 1 ? 'event' : 'events'}
          </li>
          <li>
            {impact.questions}
            {impact.questions === 1 ? 'decision' : 'decisions'} and
            {impact.suggestions} environment {impact.suggestions === 1 ? 'note' : 'notes'}
          </li>
        </ul>
      {:else}
        <p class="text-muted-foreground">Counting what will be removed…</p>
      {/if}
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={busy}>Cancel</AlertDialog.Cancel>
      <Button variant="destructive" onclick={confirmDelete} disabled={busy}>
        {busy ? 'Deleting…' : 'Delete'}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
