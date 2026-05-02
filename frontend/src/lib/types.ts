export type RecordBase = {
  id: string
  created: string
  updated: string
}

export type Objective = RecordBase & {
  title: string
  description?: string
  type: 'life' | 'business' | 'health' | 'product' | 'learning'
  status: 'active' | 'completed' | 'abandoned' | 'paused'
  deadline?: string
  okr_cycle?: string
  parent?: string
  confidence?: number
  emoji?: string
  expand?: { key_results?: KeyResult[] }
}

export type KeyResult = RecordBase & {
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

export type Project = RecordBase & {
  title: string
  description?: string
  type: 'saas' | 'site' | 'service' | 'personal' | 'content' | 'infra'
  status: 'ideation' | 'build' | 'launched' | 'paused' | 'archived'
  key_result?: string
  energy_level: 'low' | 'medium' | 'high'
  priority?: number
  url?: string
  deadline?: string
  tags?: string[]
}

export type Task = RecordBase & {
  title: string
  project?: string
  status: 'todo' | 'in_progress' | 'done' | 'cancelled' | 'waiting'
  priority?: number
  energy_level?: 'low' | 'medium' | 'high'
  estimated_minutes?: number
  actual_minutes?: number
  due_date?: string
  completed_at?: string
  tags?: string[]
  notes?: string
}

export type Victory = RecordBase & {
  title: string
  description?: string
  type: 'milestone' | 'habit' | 'personal' | 'professional' | 'product' | 'health' | 'financial'
  impact_score?: number
  key_result?: string
  project?: string
  celebrated_at?: string
  emoji?: string
}

export type Metric = RecordBase & {
  name: string
  description?: string
  category: 'health' | 'work' | 'finance' | 'learning' | 'product' | 'personal' | 'custom'
  unit?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual'
  target_value?: number
  is_active?: boolean
  emoji?: string
  higher_is_better?: boolean
}

export type MetricEntry = RecordBase & {
  metric: string
  value: number
  note?: string
  recorded_at?: string
  source?: 'manual' | 'agent' | 'webhook' | 'import'
}

export type Deadline = RecordBase & {
  title: string
  description?: string
  entity_type?: string
  entity_id?: string
  due_at: string
  alert_at?: string
  status: 'upcoming' | 'overdue' | 'done' | 'snoozed'
  snooze_until?: string
  emoji?: string
}

export type Agent = RecordBase & {
  name: string
  description?: string
  type: 'windmill' | 'n8n' | 'webhook' | 'llm_chain' | 'cron' | 'mcp'
  config?: Record<string, unknown>
  trigger_type: 'manual' | 'schedule' | 'event' | 'webhook' | 'realtime'
  schedule?: string
  status: 'idle' | 'running' | 'paused' | 'error' | 'disabled'
  last_run_at?: string
  last_output?: Record<string, unknown>
  emoji?: string
}

// Utilitaires
export function krProgress(kr: KeyResult): number {
  if (!kr.target_value || kr.target_value === 0) return 0
  const baseline = kr.baseline_value ?? 0
  const current = kr.current_value ?? baseline
  return Math.min(100, Math.max(0,
    Math.round(((current - baseline) / (kr.target_value - baseline)) * 100)
  ))
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-emerald-400',
    completed: 'text-indigo-400',
    abandoned: 'text-zinc-500',
    paused: 'text-amber-400',
    on_track: 'text-emerald-400',
    at_risk: 'text-amber-400',
    behind: 'text-rose-400',
    idle: 'text-zinc-400',
    running: 'text-indigo-400',
    error: 'text-rose-400',
    upcoming: 'text-zinc-300',
    overdue: 'text-rose-400',
    done: 'text-emerald-400',
  }
  return map[status] ?? 'text-zinc-400'
}

export function statusBg(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    completed: 'bg-indigo-500/10 text-indigo-400',
    abandoned: 'bg-zinc-500/10 text-zinc-400',
    paused: 'bg-amber-500/10 text-amber-400',
    on_track: 'bg-emerald-500/10 text-emerald-400',
    at_risk: 'bg-amber-500/10 text-amber-400',
    behind: 'bg-rose-500/10 text-rose-400',
    upcoming: 'bg-zinc-500/10 text-zinc-300',
    overdue: 'bg-rose-500/10 text-rose-400',
    done: 'bg-emerald-500/10 text-emerald-400',
  }
  return map[status] ?? 'bg-zinc-500/10 text-zinc-400'
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
