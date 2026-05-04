/// <reference path="../pb_data/types.d.ts" />
// PocketBase v0.22 — migration via dbx.Builder (raw SQL)
// Le paramètre `db` est un dbx.Builder, PAS l'App.
// API disponible : newQuery, insert, upsert, createTable, addColumn, etc.

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

// Construit la def de colonne SQL pour chaque type de champ
function sqlCol(f) {
  const t = f.type
  const ms = (f.options || {}).maxSelect
  if (t === "text" || t === "editor" || t === "url" || t === "date")
    return `"${f.name}" TEXT DEFAULT '' NOT NULL`
  if (t === "number")  return `"${f.name}" NUMERIC DEFAULT 0 NOT NULL`
  if (t === "bool")    return `"${f.name}" BOOLEAN DEFAULT FALSE NOT NULL`
  if (t === "json")    return `"${f.name}" JSON DEFAULT NULL`
  if (t === "select")  return ms === 1 ? `"${f.name}" TEXT DEFAULT '' NOT NULL` : `"${f.name}" JSON DEFAULT '[]' NOT NULL`
  if (t === "relation")return ms === 1 ? `"${f.name}" TEXT DEFAULT '' NOT NULL` : `"${f.name}" JSON DEFAULT '[]' NOT NULL`
  return `"${f.name}" TEXT DEFAULT '' NOT NULL`
}

// Construit les options PocketBase pour chaque type
function pbOptions(f) {
  const o = f.options || {}
  const t = f.type
  if (t === "text")     return {min: null, max: null, pattern: ""}
  if (t === "editor")   return {convertUrls: false}
  if (t === "url")      return {exceptDomains: null, onlyDomains: null}
  if (t === "date")     return {min: "", max: ""}
  if (t === "number")   return {min: null, max: null, noDecimal: false}
  if (t === "bool")     return {}
  if (t === "json")     return {maxSize: 2000000}
  if (t === "select")   return {maxSelect: o.maxSelect || 1, values: o.values || []}
  if (t === "relation") return {collectionId: o.collectionId, cascadeDelete: !!o.cascadeDelete, minSelect: null, maxSelect: o.maxSelect || 1, displayFields: null}
  return {}
}

// Crée la table de données + l'entrée dans _collections
function createCollection(db, colId, colName, fields) {
  const cols = fields.map(f => sqlCol(f)).join(", ")
  db.newQuery(
    `CREATE TABLE IF NOT EXISTS "${colName}" (` +
    `"id" TEXT PRIMARY KEY DEFAULT ('r'||lower(hex(randomblob(7)))) NOT NULL, ` +
    `"created" TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')) NOT NULL, ` +
    `"updated" TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')) NOT NULL, ` +
    cols + `)`
  ).execute()

  const schema = JSON.stringify(
    fields.map((f, i) => ({
      system: false,
      id: colId.substring(0, 5) + "_" + i,
      name: f.name,
      type: f.type,
      required: !!f.required,
      presentable: false,
      unique: false,
      options: pbOptions(f),
    }))
  ).replace(/'/g, "''")   // escape single quotes pour SQL

  db.newQuery(
    `INSERT OR IGNORE INTO _collections (id, name, type, system, schema, indexes, options) ` +
    `VALUES ('${colId}', '${colName}', 'base', 0, '${schema}', '[]', '{}')`
  ).execute()
}

migrate((db) => {

  // ── 1. Objectives ────────────────────────────────────────────────────────────
  createCollection(db, IDS.objectives, "objectives", [
    {name: "title",       type: "text",     required: true},
    {name: "description", type: "editor"},
    {name: "type",        type: "select",   options: {maxSelect: 1, values: ["life","business","health","product","learning"]}},
    {name: "status",      type: "select",   options: {maxSelect: 1, values: ["active","completed","abandoned","paused"]}},
    {name: "deadline",    type: "date"},
    {name: "okr_cycle",   type: "text"},
    {name: "parent",      type: "relation", options: {collectionId: IDS.objectives, cascadeDelete: false, maxSelect: 1}},
    {name: "confidence",  type: "number"},
    {name: "emoji",       type: "text"},
  ])

  // ── 2. Key Results ───────────────────────────────────────────────────────────
  createCollection(db, IDS.keyResults, "key_results", [
    {name: "objective",      type: "relation", required: true,  options: {collectionId: IDS.objectives, cascadeDelete: true,  maxSelect: 1}},
    {name: "title",          type: "text",     required: true},
    {name: "type",           type: "select",   options: {maxSelect: 1, values: ["numeric","boolean","milestone"]}},
    {name: "unit",           type: "text"},
    {name: "current_value",  type: "number"},
    {name: "target_value",   type: "number"},
    {name: "baseline_value", type: "number"},
    {name: "confidence",     type: "number"},
    {name: "status",         type: "select",   options: {maxSelect: 1, values: ["on_track","at_risk","behind","completed"]}},
    {name: "due_date",       type: "date"},
    {name: "notes",          type: "text"},
  ])

  // ── 3. Projects ──────────────────────────────────────────────────────────────
  createCollection(db, IDS.projects, "projects", [
    {name: "title",        type: "text",     required: true},
    {name: "description",  type: "editor"},
    {name: "type",         type: "select",   options: {maxSelect: 1, values: ["saas","site","service","personal","content","infra"]}},
    {name: "status",       type: "select",   options: {maxSelect: 1, values: ["ideation","build","launched","paused","archived"]}},
    {name: "key_result",   type: "relation", options: {collectionId: IDS.keyResults, cascadeDelete: false, maxSelect: 1}},
    {name: "energy_level", type: "select",   options: {maxSelect: 1, values: ["low","medium","high"]}},
    {name: "priority",     type: "number"},
    {name: "url",          type: "url"},
    {name: "deadline",     type: "date"},
    {name: "tags",         type: "json"},
  ])

  // ── 4. Tasks ─────────────────────────────────────────────────────────────────
  createCollection(db, IDS.tasks, "tasks", [
    {name: "title",             type: "text",     required: true},
    {name: "project",           type: "relation", options: {collectionId: IDS.projects, cascadeDelete: false, maxSelect: 1}},
    {name: "status",            type: "select",   options: {maxSelect: 1, values: ["todo","in_progress","done","cancelled","waiting"]}},
    {name: "priority",          type: "number"},
    {name: "energy_level",      type: "select",   options: {maxSelect: 1, values: ["low","medium","high"]}},
    {name: "estimated_minutes", type: "number"},
    {name: "actual_minutes",    type: "number"},
    {name: "due_date",          type: "date"},
    {name: "completed_at",      type: "date"},
    {name: "tags",              type: "json"},
    {name: "notes",             type: "text"},
  ])

  // ── 5. Victories ─────────────────────────────────────────────────────────────
  createCollection(db, IDS.victories, "victories", [
    {name: "title",         type: "text",     required: true},
    {name: "description",   type: "text"},
    {name: "type",          type: "select",   options: {maxSelect: 1, values: ["milestone","habit","personal","professional","product","health","financial"]}},
    {name: "impact_score",  type: "number"},
    {name: "key_result",    type: "relation", options: {collectionId: IDS.keyResults, cascadeDelete: false, maxSelect: 1}},
    {name: "project",       type: "relation", options: {collectionId: IDS.projects,   cascadeDelete: false, maxSelect: 1}},
    {name: "celebrated_at", type: "date"},
    {name: "emoji",         type: "text"},
  ])

  // ── 6. Metrics ───────────────────────────────────────────────────────────────
  createCollection(db, IDS.metrics, "metrics", [
    {name: "name",             type: "text",   required: true},
    {name: "description",      type: "text"},
    {name: "category",         type: "select", options: {maxSelect: 1, values: ["health","work","finance","learning","product","personal","custom"]}},
    {name: "unit",             type: "text"},
    {name: "frequency",        type: "select", options: {maxSelect: 1, values: ["daily","weekly","monthly","manual"]}},
    {name: "target_value",     type: "number"},
    {name: "is_active",        type: "bool"},
    {name: "emoji",            type: "text"},
    {name: "higher_is_better", type: "bool"},
  ])

  // ── 7. Metric Entries ────────────────────────────────────────────────────────
  createCollection(db, IDS.metricEntries, "metric_entries", [
    {name: "metric",      type: "relation", required: true, options: {collectionId: IDS.metrics, cascadeDelete: true, maxSelect: 1}},
    {name: "value",       type: "number",   required: true},
    {name: "note",        type: "text"},
    {name: "recorded_at", type: "date"},
    {name: "source",      type: "select",   options: {maxSelect: 1, values: ["manual","agent","webhook","import"]}},
  ])

  // ── 8. Deadlines ─────────────────────────────────────────────────────────────
  createCollection(db, IDS.deadlines, "deadlines", [
    {name: "title",        type: "text",   required: true},
    {name: "description",  type: "text"},
    {name: "entity_type",  type: "select", options: {maxSelect: 1, values: ["task","project","key_result","objective","custom"]}},
    {name: "entity_id",    type: "text"},
    {name: "due_at",       type: "date",   required: true},
    {name: "alert_at",     type: "date"},
    {name: "status",       type: "select", options: {maxSelect: 1, values: ["upcoming","overdue","done","snoozed"]}},
    {name: "snooze_until", type: "date"},
    {name: "emoji",        type: "text"},
  ])

  // ── 9. Agents ────────────────────────────────────────────────────────────────
  createCollection(db, IDS.agents, "agents", [
    {name: "name",         type: "text",   required: true},
    {name: "description",  type: "text"},
    {name: "type",         type: "select", options: {maxSelect: 1, values: ["windmill","n8n","webhook","llm_chain","cron","mcp"]}},
    {name: "config",       type: "json"},
    {name: "trigger_type", type: "select", options: {maxSelect: 1, values: ["manual","schedule","event","webhook","realtime"]}},
    {name: "schedule",     type: "text"},
    {name: "status",       type: "select", options: {maxSelect: 1, values: ["idle","running","paused","error","disabled"]}},
    {name: "last_run_at",  type: "date"},
    {name: "last_output",  type: "json"},
    {name: "emoji",        type: "text"},
  ])

  // ── 10. Tools ────────────────────────────────────────────────────────────────
  createCollection(db, IDS.tools, "tools", [
    {name: "name",        type: "text",   required: true},
    {name: "description", type: "text"},
    {name: "category",    type: "select", options: {maxSelect: 1, values: ["calendar","github","notion","slack","claude","search","custom","mcp"]}},
    {name: "provider",    type: "text"},
    {name: "credentials", type: "json"},
    {name: "schema",      type: "json"},
    {name: "is_active",   type: "bool"},
    {name: "webhook_url", type: "url"},
  ])

  // ── 11. Agent Runs ───────────────────────────────────────────────────────────
  createCollection(db, IDS.agentRuns, "agent_runs", [
    {name: "agent",       type: "relation", required: true, options: {collectionId: IDS.agents, cascadeDelete: true, maxSelect: 1}},
    {name: "status",      type: "select",   options: {maxSelect: 1, values: ["running","success","error","timeout","cancelled"]}},
    {name: "input",       type: "json"},
    {name: "output",      type: "json"},
    {name: "error",       type: "text"},
    {name: "started_at",  type: "date"},
    {name: "finished_at", type: "date"},
    {name: "duration_ms", type: "number"},
  ])

  // ── 12. Focus Sessions ───────────────────────────────────────────────────────
  createCollection(db, IDS.focusSessions, "focus_sessions", [
    {name: "task",          type: "relation", options: {collectionId: IDS.tasks, cascadeDelete: false, maxSelect: 1}},
    {name: "type",          type: "select",   options: {maxSelect: 1, values: ["pomodoro","deep_work","review","planning","quick"]}},
    {name: "started_at",    type: "date",     required: true},
    {name: "ended_at",      type: "date"},
    {name: "interruptions", type: "number"},
    {name: "notes",         type: "text"},
    {name: "energy_start",  type: "number"},
    {name: "energy_end",    type: "number"},
  ])

}, (db) => {
  // Rollback — supprimer dans l'ordre inverse (relations d'abord)
  const tables = [
    "focus_sessions", "agent_runs", "tools", "agents",
    "deadlines", "metric_entries", "metrics", "victories",
    "tasks", "projects", "key_results", "objectives",
  ]
  for (const t of tables) {
    db.newQuery(`DROP TABLE IF EXISTS "${t}"`).execute()
    db.newQuery(`DELETE FROM _collections WHERE name='${t}'`).execute()
  }
})
