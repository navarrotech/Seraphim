<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from 'bits-ui'
  import { Check, Minus } from '@lucide/svelte'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props()
</script>

<CheckboxPrimitive.Root
  bind:ref
  bind:checked
  bind:indeterminate
  data-slot="checkbox"
  class={cn(
    'peer size-4 shrink-0 rounded border border-input shadow-sm outline-none transition-shadow focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
    className
  )}
  {...restProps}
>
  {#snippet children({ checked, indeterminate })}
    <div class="flex items-center justify-center text-current">
      {#if indeterminate}
        <Minus class="size-3.5" />
      {:else if checked}
        <Check class="size-3.5" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
