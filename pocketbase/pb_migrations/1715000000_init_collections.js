/// <reference path="../pb_data/types.d.ts" />

// IDs stables pour les relations inter-collections (15 chars alphanumeric)
const IDS = {
  objectives:    "lifeosobjective",
  keyResults:    "lifeosk0result1",
  projects:      "lifeosproj00001",
  tasks:         "lifeostask00001",
  victories:     "lifeosvictory01",
  metrics:       "lifeosmetrics01",
  metricEntries: "lifeosment00001",
  deadlines:     "lifeosdead00001",
  agents:        "lifeosagent0001",
  tools:         "lifeostool00001",
  agentRuns:     "lifeosruns00001",
  focusSessions: "lifeosfocus0001",
}

migrate((app) => {

  // ── 1. Objectives ────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.objectives,
    name: "objectives",
    type: "base",
    fields: [
      { name: "title",       type: "text",   required: true,  min: 1, max: 200 },
      { name: "description", type: "editor", required: false },
      { name: "type",        type: "select", required: false, values: ["life","business","health","product","learning"], maxSelect: 1 },
      { name: "status",      type: "select", required: false, values: ["active","completed","abandoned","paused"], maxSelect: 1 },
      { name: "deadline",    type: "date",   required: false },
      { name: "okr_cycle",   type: "text",   required: false, max: 20 },
      { name: "parent",      type: "relation", required: false, collectionId: IDS.objectives, maxSelect: 1, cascadeDelete: false },
      { name: "confidence",  type: "number", required: false, min: 0, max: 100 },
      { name: "emoji",       type: "text",   required: false, max: 4 },
    ]
  }))

  // ── 2. Key Results ───────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.keyResults,
    name: "key_results",
    type: "base",
    fields: [
      { name: "objective",      type: "relation", required: true,  collectionId: IDS.objectives, maxSelect: 1, cascadeDelete: true },
      { name: "title",          type: "text",     required: true,  min: 1, max: 200 },
      { name: "type",           type: "select",   required: false, values: ["numeric","boolean","milestone"], maxSelect: 1 },
      { name: "unit",           type: "text",     required: false, max: 20 },
      { name: "current_value",  type: "number",   required: false },
      { name: "target_value",   type: "number",   required: false },
      { name: "baseline_value", type: "number",   required: false },
      { name: "confidence",     type: "number",   required: false, min: 0, max: 100 },
      { name: "status",         type: "select",   required: false, values: ["on_track","at_risk","behind","completed"], maxSelect: 1 },
      { name: "due_date",       type: "date",     required: false },
      { name: "notes",          type: "text",     required: false },
    ]
  }))

  // ── 3. Projects ──────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.projects,
    name: "projects",
    type: "base",
    fields: [
      { name: "title",        type: "text",     required: true,  min: 1, max: 200 },
      { name: "description",  type: "editor",   required: false },
      { name: "type",         type: "select",   required: false, values: ["saas","site","service","personal","content","infra"], maxSelect: 1 },
      { name: "status",       type: "select",   required: false, values: ["ideation","build","launched","paused","archived"], maxSelect: 1 },
      { name: "key_result",   type: "relation", required: false, collectionId: IDS.keyResults, maxSelect: 1, cascadeDelete: false },
      { name: "energy_level", type: "select",   required: false, values: ["low","medium","high"], maxSelect: 1 },
      { name: "priority",     type: "number",   required: false, min: 0, max: 10 },
      { name: "url",          type: "url",      required: false },
      { name: "deadline",     type: "date",     required: false },
      { name: "tags",         type: "json",     required: false },
    ]
  }))

  // ── 4. Tasks ─────────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.tasks,
    name: "tasks",
    type: "base",
    fields: [
      { name: "title",             type: "text",     required: true,  min: 1, max: 300 },
      { name: "project",           type: "relation", required: false, collectionId: IDS.projects, maxSelect: 1, cascadeDelete: false },
      { name: "status",            type: "select",   required: false, values: ["todo","in_progress","done","cancelled","waiting"], maxSelect: 1 },
      { name: "priority",          type: "number",   required: false, min: 0, max: 5 },
      { name: "energy_level",      type: "select",   required: false, values: ["low","medium","high"], maxSelect: 1 },
      { name: "estimated_minutes", type: "number",   required: false },
      { name: "actual_minutes",    type: "number",   required: false },
      { name: "due_date",          type: "date",     required: false },
      { name: "completed_at",      type: "date",     required: false },
      { name: "tags",              type: "json",     required: false },
      { name: "notes",             type: "text",     required: false },
    ]
  }))

  // ── 5. Victories ─────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.victories,
    name: "victories",
    type: "base",
    fields: [
      { name: "title",         type: "text",     required: true,  min: 1, max: 300 },
      { name: "description",   type: "text",     required: false },
      { name: "type",          type: "select",   required: false, values: ["milestone","habit","personal","professional","product","health","financial"], maxSelect: 1 },
      { name: "impact_score",  type: "number",   required: false, min: 1, max: 10 },
      { name: "key_result",    type: "relation", required: false, collectionId: IDS.keyResults, maxSelect: 1, cascadeDelete: false },
      { name: "project",       type: "relation", required: false, collectionId: IDS.projects,   maxSelect: 1, cascadeDelete: false },
      { name: "celebrated_at", type: "date",     required: false },
      { name: "emoji",         type: "text",     required: false, max: 4 },
    ]
  }))

  // ── 6. Metrics ───────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.metrics,
    name: "metrics",
    type: "base",
    fields: [
      { name: "name",             type: "text",   required: true,  min: 1, max: 100 },
      { name: "description",      type: "text",   required: false },
      { name: "category",         type: "select", required: false, values: ["health","work","finance","learning","product","personal","custom"], maxSelect: 1 },
      { name: "unit",             type: "text",   required: false, max: 20 },
      { name: "frequency",        type: "select", required: false, values: ["daily","weekly","monthly","manual"], maxSelect: 1 },
      { name: "target_value",     type: "number", required: false },
      { name: "is_active",        type: "bool",   required: false },
      { name: "emoji",            type: "text",   required: false, max: 4 },
      { name: "higher_is_better", type: "bool",   required: false },
    ]
  }))

  // ── 7. Metric Entries ────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.metricEntries,
    name: "metric_entries",
    type: "base",
    fields: [
      { name: "metric",      type: "relation", required: true,  collectionId: IDS.metrics, maxSelect: 1, cascadeDelete: true },
      { name: "value",       type: "number",   required: true },
      { name: "note",        type: "text",     required: false },
      { name: "recorded_at", type: "date",     required: false },
      { name: "source",      type: "select",   required: false, values: ["manual","agent","webhook","import"], maxSelect: 1 },
    ]
  }))

  // ── 8. Deadlines ─────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.deadlines,
    name: "deadlines",
    type: "base",
    fields: [
      { name: "title",        type: "text",   required: true,  min: 1, max: 200 },
      { name: "description",  type: "text",   required: false },
      { name: "entity_type",  type: "select", required: false, values: ["task","project","key_result","objective","custom"], maxSelect: 1 },
      { name: "entity_id",    type: "text",   required: false },
      { name: "due_at",       type: "date",   required: true },
      { name: "alert_at",     type: "date",   required: false },
      { name: "status",       type: "select", required: false, values: ["upcoming","overdue","done","snoozed"], maxSelect: 1 },
      { name: "snooze_until", type: "date",   required: false },
      { name: "emoji",        type: "text",   required: false, max: 4 },
    ]
  }))

  // ── 9. Agents ────────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.agents,
    name: "agents",
    type: "base",
    fields: [
      { name: "name",         type: "text",   required: true,  min: 1, max: 100 },
      { name: "description",  type: "text",   required: false },
      { name: "type",         type: "select", required: false, values: ["windmill","n8n","webhook","llm_chain","cron","mcp"], maxSelect: 1 },
      { name: "config",       type: "json",   required: false },
      { name: "trigger_type", type: "select", required: false, values: ["manual","schedule","event","webhook","realtime"], maxSelect: 1 },
      { name: "schedule",     type: "text",   required: false },
      { name: "status",       type: "select", required: false, values: ["idle","running","paused","error","disabled"], maxSelect: 1 },
      { name: "last_run_at",  type: "date",   required: false },
      { name: "last_output",  type: "json",   required: false },
      { name: "emoji",        type: "text",   required: false, max: 4 },
    ]
  }))

  // ── 10. Tools ────────────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.tools,
    name: "tools",
    type: "base",
    fields: [
      { name: "name",        type: "text",   required: true,  min: 1, max: 100 },
      { name: "description", type: "text",   required: false },
      { name: "category",    type: "select", required: false, values: ["calendar","github","notion","slack","claude","search","custom","mcp"], maxSelect: 1 },
      { name: "provider",    type: "text",   required: false },
      { name: "credentials", type: "json",   required: false },
      { name: "schema",      type: "json",   required: false },
      { name: "is_active",   type: "bool",   required: false },
      { name: "webhook_url", type: "url",    required: false },
    ]
  }))

  // ── 11. Agent Runs ───────────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.agentRuns,
    name: "agent_runs",
    type: "base",
    fields: [
      { name: "agent",       type: "relation", required: true,  collectionId: IDS.agents, maxSelect: 1, cascadeDelete: true },
      { name: "status",      type: "select",   required: false, values: ["running","success","error","timeout","cancelled"], maxSelect: 1 },
      { name: "input",       type: "json",     required: false },
      { name: "output",      type: "json",     required: false },
      { name: "error",       type: "text",     required: false },
      { name: "started_at",  type: "date",     required: false },
      { name: "finished_at", type: "date",     required: false },
      { name: "duration_ms", type: "number",   required: false },
    ]
  }))

  // ── 12. Focus Sessions ───────────────────────────────────────────────────────
  app.save(new Collection({
    id: IDS.focusSessions,
    name: "focus_sessions",
    type: "base",
    fields: [
      { name: "task",          type: "relation", required: false, collectionId: IDS.tasks, maxSelect: 1, cascadeDelete: false },
      { name: "type",          type: "select",   required: false, values: ["pomodoro","deep_work","review","planning","quick"], maxSelect: 1 },
      { name: "started_at",    type: "date",     required: true },
      { name: "ended_at",      type: "date",     required: false },
      { name: "interruptions", type: "number",   required: false, min: 0 },
      { name: "notes",         type: "text",     required: false },
      { name: "energy_start",  type: "number",   required: false, min: 1, max: 10 },
      { name: "energy_end",    type: "number",   required: false, min: 1, max: 10 },
    ]
  }))

}, (app) => {
  // Rollback — supprimer dans l'ordre inverse
  const names = [
    "focus_sessions", "agent_runs", "tools", "agents",
    "deadlines", "metric_entries", "metrics", "victories",
    "tasks", "projects", "key_results", "objectives"
  ]
  for (const name of names) {
    try {
      const col = app.findCollectionByNameOrId(name)
      app.delete(col)
    } catch (e) { /* déjà absent */ }
  }
})
