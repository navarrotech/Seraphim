<script lang="ts">
  import { SETTINGS_GROUPS } from '$lib/settings/sections'
</script>

<!-- Stripe-style settings home (issue #344): every category in a clean grid under
     at most three grouped headings, sized to fit a 1920x1080 screen without scroll.
     Each card links to its dedicated page at /settings/{id}. -->
<div class="mx-auto max-w-6xl space-y-10 px-6 py-8">
  <h1 class="text-2xl font-semibold">Settings</h1>

  {#each SETTINGS_GROUPS as group (group.title)}
    <section class="space-y-4">
      <h2 class="text-sm font-semibold tracking-wide text-muted-foreground">{group.title}</h2>
      <div class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each group.sections as section (section.id)}
          {@const Icon = section.icon}
          <a
            href={`/settings/${section.id}`}
            class="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/60"
          >
            <span
              class="mt-0.5 flex size-9 flex-none items-center justify-center rounded-md border border-border bg-card {section.danger
                ? 'text-destructive'
                : 'text-muted-foreground'}"
            >
              <Icon class="size-4" />
            </span>
            <span class="min-w-0">
              <span
                class="block font-semibold group-hover:underline {section.danger
                  ? 'text-destructive'
                  : 'text-primary'}"
              >
                {section.title}
              </span>
              <span class="mt-0.5 block text-sm leading-snug text-muted-foreground">
                {section.description}
              </span>
            </span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>
