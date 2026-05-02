import { writable, derived } from 'svelte/store'
import type { Objective, KeyResult, Victory, Metric, MetricEntry, Deadline, Agent } from '$lib/types'
import { pb } from '$lib/pb'

// ─── Objectives ───────────────────────────────────────────────────────────────
export const objectives = writable<Objective[]>([])
export const keyResults = writable<KeyResult[]>([])
export const victories = writable<Victory[]>([])
export const metrics = writable<Metric[]>([])
export const metricEntries = writable<MetricEntry[]>([])
export const deadlines = writable<Deadline[]>([])
export const agents = writable<Agent[]>([])

export const loading = writable(false)
export const error = writable<string | null>(null)

// ─── Loaders ──────────────────────────────────────────────────────────────────
export async function loadObjectives() {
  try {
    const res = await pb.collection('objectives').getFullList<Objective>({
      sort: '-created',
      filter: 'status != "abandoned"'
    })
    objectives.set(res)
  } catch (e: unknown) {
    error.set(e instanceof Error ? e.message : 'Erreur chargement objectifs')
  }
}

export async function loadKeyResults(objectiveId?: string) {
  try {
    const filter = objectiveId ? `objective = "${objectiveId}"` : ''
    const res = await pb.collection('key_results').getFullList<KeyResult>({ filter, sort: 'created' })
    keyResults.set(res)
  } catch (e: unknown) {
    error.set(e instanceof Error ? e.message : 'Erreur chargement KRs')
  }
}

export async function loadVictories(limit = 20) {
  try {
    const res = await pb.collection('victories').getList<Victory>(1, limit, { sort: '-created' })
    victories.set(res.items)
  } catch (e: unknown) {
    error.set(e instanceof Error ? e.message : 'Erreur chargement victoires')
  }
}

export async function loadMetrics() {
  try {
    const res = await pb.collection('metrics').getFullList<Metric>({
      filter: 'is_active = true',
      sort: 'name'
    })
    metrics.set(res)
  } catch (e: unknown) {
    error.set(e instanceof Error ? e.message : 'Erreur chargement métriques')
  }
}

export async function loadDeadlines() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await pb.collection('deadlines').getFullList<Deadline>({
      filter: `status != "done" && due_at >= "${today}"`,
      sort: 'due_at'
    })
    deadlines.set(res)
  } catch (e: unknown) {
    error.set(e instanceof Error ? e.message : 'Erreur chargement deadlines')
  }
}

export async function loadAgents() {
  try {
    const res = await pb.collection('agents').getFullList<Agent>({ sort: 'name' })
    agents.set(res)
  } catch (e: unknown) {
    error.set(e instanceof Error ? e.message : 'Erreur chargement agents')
  }
}

export async function loadAll() {
  loading.set(true)
  await Promise.all([
    loadObjectives(),
    loadVictories(),
    loadMetrics(),
    loadDeadlines(),
    loadAgents()
  ])
  loading.set(false)
}

// ─── Derived ──────────────────────────────────────────────────────────────────
export const activeObjectives = derived(objectives, $o =>
  $o.filter(o => o.status === 'active')
)

export const overduedDeadlines = derived(deadlines, $d => {
  const now = new Date()
  return $d.filter(d => new Date(d.due_at) < now && d.status !== 'done')
})
