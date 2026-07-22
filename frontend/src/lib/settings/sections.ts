import type { Component } from 'svelte'

// User interface
import {
  Archive,
  Bell,
  Blocks,
  Boxes,
  CalendarClock,
  Download,
  Gauge,
  KeyRound,
  Settings2,
  Sparkles,
  TrainFront,
  TriangleAlert,
  Zap
} from '@lucide/svelte'

// The Settings information architecture (issue #344): a Stripe-style grid of
// dedicated pages, grouped under at most three headings. Each section renders at
// `/settings/{id}`; this registry drives both the grid cards and each page header.
export type SettingsSection = {
  id: string
  title: string
  description: string
  icon: Component
  // A danger card gets a destructive accent on the grid.
  danger?: boolean
}

export type SettingsGroup = {
  title: string
  sections: SettingsSection[]
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Agent',
    sections: [
      {
        id: 'general',
        title: 'General',
        description: 'Organization name, model, review policy, and branch naming.',
        icon: Settings2
      },
      {
        id: 'llms',
        title: 'LLMs',
        description: 'The Claude subscriptions, tokens, and API keys the agent runs on.',
        icon: Sparkles
      },
      {
        id: 'workspace',
        title: 'Workspace',
        description: 'Agent instructions, setup script, config repo, variables, and network.',
        icon: Boxes
      },
      {
        id: 'availability',
        title: 'Availability',
        description: 'The hours and days the agent picks up new work.',
        icon: CalendarClock
      },
      {
        id: 'usage',
        title: 'Usage & stats',
        description: 'Auto-pause near the usage limit and reset the global statistics.',
        icon: Gauge
      }
    ]
  },
  {
    title: 'Workflow & integrations',
    sections: [
      {
        id: 'automation',
        title: 'Automation',
        description: 'Rules that react to issue events and move cards automatically.',
        icon: Zap
      },
      {
        id: 'railways',
        title: 'Railways',
        description: 'Parallel agent lanes and the repositories assigned to each.',
        icon: TrainFront
      },
      {
        id: 'apps',
        title: 'Apps',
        description: 'Optional integrations you can connect: Jira and Tailscale.',
        icon: Blocks
      },
      {
        id: 'secrets',
        title: 'Secrets',
        description: 'GitHub token and the realtime issue-webhook secrets.',
        icon: KeyRound
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Attention and completion sounds, and issue-comment updates.',
        icon: Bell
      }
    ]
  },
  {
    title: 'System',
    sections: [
      {
        id: 'updates',
        title: 'Updates',
        description: 'Check for and apply new builds from GitHub.',
        icon: Download
      },
      {
        id: 'backup',
        title: 'Backup & restore',
        description: 'Export or import your settings and repositories as JSON.',
        icon: Archive
      },
      {
        id: 'danger',
        title: 'Danger zone',
        description: 'Hard reset the agent and other destructive actions.',
        icon: TriangleAlert,
        danger: true
      }
    ]
  }
]

// Flat lookup so a `/settings/[section]` page can resolve its own header, and so an
// unknown section 404s cleanly.
export const SECTION_BY_ID: Record<string, SettingsSection> = Object.fromEntries(
  SETTINGS_GROUPS.flatMap((group) => group.sections).map((section) => [section.id, section])
)
