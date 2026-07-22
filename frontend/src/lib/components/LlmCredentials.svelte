<script lang="ts">
  import type { CredentialKind, LlmCredential } from '$lib/types'
  import type { DndEvent } from 'svelte-dnd-action'

  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'
  import { dndzone } from 'svelte-dnd-action'
  import { GripVertical, Trash2, Plus, ExternalLink } from '@lucide/svelte'

  import {
    addApiKeyCredential,
    addSetupTokenCredential,
    deleteCredential,
    extractApiError,
    finishCredentialOauth,
    listCredentials,
    reorderCredentials,
    startCredentialOauth,
    updateCredential
  } from '$lib/api'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { Badge } from '$lib/components/ui/badge'
  import { Switch } from '$lib/components/ui/switch'
  import * as AlertDialog from '$lib/components/ui/alert-dialog'

  const FLIP_MS = 150

  // Human labels for each credential kind, shown on the row badge and add tabs.
  const KIND_LABELS = {
    subscription_oauth: 'Subscription',
    setup_token: 'Setup token',
    api_key: 'API key'
  } as const satisfies Record<CredentialKind, string>

  let credentials = $state<LlmCredential[]>([])
  let loading = $state(true)

  async function load() {
    try {
      credentials = await listCredentials()
    }
    catch (error) {
      toast.error(await extractApiError(error, 'Could not load credentials'))
    }
    finally {
      loading = false
    }
  }

  onMount(load)

  // --- Drag-and-drop priority reorder ----------------------------------------
  function handleConsider(event: CustomEvent<DndEvent<LlmCredential>>) {
    credentials = event.detail.items
  }

  async function handleFinalize(event: CustomEvent<DndEvent<LlmCredential>>) {
    credentials = event.detail.items
    try {
      credentials = await reorderCredentials(credentials.map((credential) => credential.id))
    }
    catch (error) {
      toast.error(await extractApiError(error, 'Could not save the new order'))
      await load()
    }
  }

  // --- Row actions -----------------------------------------------------------
  async function toggleEnabled(credential: LlmCredential, enabled: boolean) {
    try {
      credentials = await updateCredential(credential.id, { enabled })
    }
    catch (error) {
      toast.error(await extractApiError(error, 'Could not update the credential'))
    }
  }

  async function saveLabel(credential: LlmCredential, label: string) {
    if (label === credential.label) {
      return
    }
    try {
      credentials = await updateCredential(credential.id, { label })
    }
    catch (error) {
      toast.error(await extractApiError(error, 'Could not rename the credential'))
    }
  }

  let deleteTarget = $state<LlmCredential | null>(null)

  async function confirmDelete() {
    const target = deleteTarget
    if (!target) {
      return
    }
    try {
      await deleteCredential(target.id)
      deleteTarget = null
      await load()
    }
    catch (error) {
      toast.error(await extractApiError(error, 'Could not delete the credential'))
    }
  }

  // --- Add a credential ------------------------------------------------------
  let addKind = $state<CredentialKind>('subscription_oauth')
  let addLabel = $state('')
  let addToken = $state('')
  let addApiKey = $state('')
  let addBusy = $state(false)
  let addError = $state<string | null>(null)
  // The subscription OAuth flow is two-step: connect (opens a consent tab), then
  // paste the code back.
  let oauthUrl = $state<string | null>(null)
  let oauthCode = $state('')

  function resetAddForm() {
    addLabel = ''
    addToken = ''
    addApiKey = ''
    addError = null
    oauthUrl = null
    oauthCode = ''
  }

  function pickKind(kind: CredentialKind) {
    addKind = kind
    resetAddForm()
  }

  async function connectSubscription() {
    addBusy = true
    addError = null
    try {
      const response = await startCredentialOauth()
      oauthUrl = response.authorize_url
      window.open(response.authorize_url, '_blank', 'noopener,noreferrer')
    }
    catch (error) {
      addError = await extractApiError(error, 'Could not start the login')
    }
    finally {
      addBusy = false
    }
  }

  async function completeSubscription() {
    const code = oauthCode.trim()
    if (!code) {
      return
    }
    addBusy = true
    addError = null
    try {
      credentials = await finishCredentialOauth(code, addLabel.trim())
      resetAddForm()
      toast.success('Subscription connected')
    }
    catch (error) {
      addError = await extractApiError(error, 'Could not complete the login')
    }
    finally {
      addBusy = false
    }
  }

  async function addToken_() {
    const token = addToken.trim()
    if (!token) {
      return
    }
    addBusy = true
    addError = null
    try {
      credentials = await addSetupTokenCredential(token, addLabel.trim())
      resetAddForm()
      toast.success('Setup token added')
    }
    catch (error) {
      addError = await extractApiError(error, 'Could not add the token')
    }
    finally {
      addBusy = false
    }
  }

  async function addKey() {
    const key = addApiKey.trim()
    if (!key) {
      return
    }
    addBusy = true
    addError = null
    try {
      credentials = await addApiKeyCredential(key, addLabel.trim())
      resetAddForm()
      toast.success('API key added')
    }
    catch (error) {
      addError = await extractApiError(error, 'Could not add the API key')
    }
    finally {
      addBusy = false
    }
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-muted-foreground">
    The agent runs on the highest-priority credential. When one hits its usage limit it is
    marked exhausted and the agent rotates to the next; only when every credential is exhausted
    does it pause, until the soonest one resets. Drag to set priority (top runs first).
  </p>

  <!-- The priority-ordered list. -->
  {#if loading}
    <p class="text-sm text-muted-foreground">Loading…</p>
  {:else if credentials.length === 0}
    <p class="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      No credentials yet. Add one below to let the agent run.
    </p>
  {:else}
    <ul
      class="space-y-2"
      use:dndzone={{ items: credentials, flipDurationMs: FLIP_MS, dropTargetStyle: {} }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each credentials as credential (credential.id)}
        <li
          class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 {credential.enabled
            ? ''
            : 'opacity-60'}"
        >
          <GripVertical class="size-4 flex-none cursor-grab text-muted-foreground active:cursor-grabbing" />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <Input
                class="h-7 w-44 text-sm font-medium"
                value={credential.label}
                placeholder={KIND_LABELS[credential.kind]}
                onblur={(event) => saveLabel(credential, event.currentTarget.value.trim())}
              />
              <Badge variant="outline">{KIND_LABELS[credential.kind]}</Badge>
              {#if credential.active}
                <Badge variant="outline" class="border-primary/50 text-primary">active</Badge>
              {:else if credential.exhausted_until}
                <Badge variant="outline" class="border-warning/50 text-warning">
                  exhausted until {new Date(credential.exhausted_until).toLocaleString()}
                </Badge>
              {:else if credential.available}
                <Badge variant="outline" class="border-success/40 text-success">ready</Badge>
              {/if}
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              {#if credential.account_email}<span>{credential.account_email}</span>{/if}
              {#if credential.token_preview}<span class="font-mono">{credential.token_preview}</span>{/if}
            </div>
            {#if credential.last_error}
              <p class="mt-1 text-xs break-words text-destructive">{credential.last_error}</p>
            {/if}
          </div>

          <span title={credential.enabled ? 'Enabled' : 'Disabled'} class="flex-none">
            <Switch
              checked={credential.enabled}
              onCheckedChange={(value) => toggleEnabled(credential, value)}
              aria-label="Enable credential"
            />
          </span>
          <Button
            variant="ghost"
            size="icon"
            class="flex-none text-destructive hover:text-destructive"
            title="Delete"
            aria-label="Delete credential"
            onclick={() => (deleteTarget = credential)}
          >
            <Trash2 class="size-4" />
          </Button>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Add a credential. -->
  <div class="rounded-lg border border-border p-4">
    <h3 class="text-sm font-semibold">Add a credential</h3>
    <div class="mt-3 flex flex-wrap gap-1.5">
      {#each Object.entries(KIND_LABELS) as [kind, kindLabel] (kind)}
        <Button
          variant={addKind === kind ? 'default' : 'outline'}
          size="sm"
          onclick={() => pickKind(kind as CredentialKind)}
        >
          {kindLabel}
        </Button>
      {/each}
    </div>

    <div class="mt-3 space-y-2">
      <div class="grid gap-1.5">
        <Label for="cred-label" class="text-xs text-muted-foreground">Label (optional)</Label>
        <Input id="cred-label" bind:value={addLabel} placeholder="e.g. Personal Max plan" />
      </div>

      {#if addKind === 'subscription_oauth'}
        <p class="text-xs text-muted-foreground">
          Connect a Claude subscription. This opens a consent tab; paste the code it shows back here.
        </p>
        <Button size="sm" disabled={addBusy} onclick={connectSubscription}>
          <ExternalLink class="size-4" /> Connect subscription
        </Button>
        {#if oauthUrl}
          <div class="grid gap-1.5">
            <a href={oauthUrl} target="_blank" rel="noopener noreferrer" class="text-xs underline">
              Reopen the consent tab
            </a>
            <Input bind:value={oauthCode} placeholder="Paste the code from the consent page" />
            <Button size="sm" disabled={addBusy} onclick={completeSubscription}>
              {addBusy ? 'Completing…' : 'Complete login'}
            </Button>
          </div>
        {/if}
      {:else if addKind === 'setup_token'}
        <p class="text-xs text-muted-foreground">
          A long-lived subscription token from <code>claude setup-token</code> (starts with
          <code>sk-ant-oat</code>). It runs the agent but reports no usage.
        </p>
        <Input type="password" bind:value={addToken} placeholder="sk-ant-oat01-…" />
        <Button size="sm" disabled={addBusy} onclick={addToken_}>
          <Plus class="size-4" /> {addBusy ? 'Adding…' : 'Add token'}
        </Button>
      {:else}
        <p class="text-xs text-muted-foreground">
          An Anthropic API key (starts with <code>sk-ant-api</code>). Billed per token; no usage gauge.
        </p>
        <Input type="password" bind:value={addApiKey} placeholder="sk-ant-api03-…" />
        <Button size="sm" disabled={addBusy} onclick={addKey}>
          <Plus class="size-4" /> {addBusy ? 'Adding…' : 'Add API key'}
        </Button>
      {/if}

      {#if addError}
        <p class="text-xs text-destructive">{addError}</p>
      {/if}
    </div>
  </div>
</div>

<AlertDialog.Root
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) {
      deleteTarget = null
    }
  }}
>
  <AlertDialog.Content>
    {#if deleteTarget}
      <AlertDialog.Header>
        <AlertDialog.Title>
          Delete this credential{deleteTarget.label ? ` (${deleteTarget.label})` : ''}?
        </AlertDialog.Title>
        <AlertDialog.Description>
          The agent will no longer run on it. This cannot be undone; you can re-add it later.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action class={buttonVariants({ variant: 'destructive' })} onclick={confirmDelete}>
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Root>
