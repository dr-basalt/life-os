import { createDirectus, rest, authentication } from '@directus/sdk'

type DirectusSchema = {
  objectives: {
    id: string
    title: string
    description?: string
    type: 'life' | 'business' | 'health' | 'product' | 'learning'
    status: 'active' | 'completed' | 'paused' | 'abandoned'
    okr_cycle?: string
    deadline?: string
    confidence?: number
    emoji?: string
  }
  key_results: {
    id: string
    objective: string
    title: string
    type: 'numeric' | 'boolean' | 'milestone'
    unit?: string
    current_value?: number
    target_value?: number
    baseline_value?: number
    confidence?: number
    status: 'on_track' | 'at_risk' | 'behind' | 'completed'
    due_date?: string
    notes?: string
  }
  tasks: {
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'done' | 'cancelled' | 'waiting'
    priority?: number
    energy_level?: 'low' | 'medium' | 'high'
    estimated_minutes?: number
    due_date?: string
    notes?: string
  }
  victories: {
    id: string
    title: string
    type: 'milestone' | 'habit' | 'insight' | 'delivery' | 'relationship'
    impact: 'small' | 'medium' | 'large' | 'epic'
    date: string
    description?: string
    objective?: string
    key_result?: string
    emoji?: string
  }
  data_gates: {
    id: string
    name: string
    type: 'api' | 'git' | 'obsidian' | 'syncthing' | 'server' | 'saas' | 'rss' | 'webhook'
    status: 'active' | 'paused' | 'error' | 'pending'
    url?: string
    description?: string
    last_sync?: string
    sync_interval_minutes?: number
    config?: Record<string, unknown>
    error_message?: string
  }
  ui_schemas: {
    id: string
    page_id: string
    title: string
    intent?: string
    layout: 'dashboard' | 'list' | 'detail' | 'form' | 'graph' | 'fullscreen'
    widgets?: unknown
    version: string
    active: boolean
  }
}

const directusUrl = process.env.DIRECTUS_URL ?? 'http://sternos-directus:8055'

export const directus = createDirectus<DirectusSchema>(directusUrl).with(rest())

export async function getAuthenticatedDirectus() {
  const client = createDirectus<DirectusSchema>(directusUrl)
    .with(authentication())
    .with(rest())

  await client.login(
    process.env.DIRECTUS_ADMIN_EMAIL ?? '',
    process.env.DIRECTUS_ADMIN_PASSWORD ?? '',
  )

  return client
}
