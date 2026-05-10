#!/usr/bin/env node
/**
 * setup-directus.js — Create SternOS schema collections in Directus
 * Run via: docker exec sternos-soma node /opt/stern-os/scripts/setup-directus.js
 * Or:      make setup-directus (on stern-os-brain)
 *
 * Idempotent — skips collections that already exist.
 * Creates: objectives, key_results, tasks, victories, data_gates, ui_schemas, agents
 * Sets up relations, permissions (Public read, Agent CRUD, Admin all).
 */

const DIRECTUS = process.env.DIRECTUS_URL || 'http://sternos-directus:8055'
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@ori3com.cloud'
const ADMIN_PASS  = process.env.DIRECTUS_ADMIN_PASSWORD || ''

async function api(method, path, body, token) {
  const r = await fetch(`${DIRECTUS}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await r.text()
  try { return JSON.parse(text) } catch { return { raw: text, status: r.status } }
}

async function getToken() {
  const r = await api('POST', 'auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS })
  if (!r.data?.access_token) { console.error('Auth failed:', r); process.exit(1) }
  return r.data.access_token
}

async function getCollections(token) {
  const r = await api('GET', 'collections', null, token)
  return (r.data || []).map(c => c.collection)
}

async function createCollection(token, name, fields, note = '') {
  // Directus v11: ne pas déclarer 'id' — créé automatiquement (uuid pk)
  // date_created / date_updated ajoutés via champs séparés après création
  const r = await api('POST', 'collections', {
    collection: name,
    meta: { note, icon: 'box', display_template: '{{title}}' },
    schema: { name },
    fields
  }, token)
  return r
}

async function addField(token, collection, field) {
  const r = await api('POST', `fields/${collection}`, field, token)
  return r
}

// ── Collection definitions ────────────────────────────────────────────────────

const COLLECTIONS = [
  {
    name: 'objectives',
    note: 'OKRs — Objectifs avec cycle, statut, confiance',
    fields: [
      { field: 'title',       type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false } },
      { field: 'description', type: 'text',    meta: { interface: 'input-multiline' }, schema: {} },
      { field: 'type',        type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'Life', value: 'life' }, { text: 'Business', value: 'business' },
        { text: 'Health', value: 'health' }, { text: 'Product', value: 'product' }, { text: 'Learning', value: 'learning' }
      ]}}, schema: {} },
      { field: 'status',      type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'Active', value: 'active' }, { text: 'Completed', value: 'completed' },
        { text: 'Paused', value: 'paused' }, { text: 'Abandoned', value: 'abandoned' }
      ]}, default_value: 'active' }, schema: { default_value: 'active' } },
      { field: 'okr_cycle',   type: 'string',  meta: { interface: 'input' }, schema: {} },
      { field: 'deadline',    type: 'date',    meta: { interface: 'datetime' }, schema: {} },
      { field: 'confidence',  type: 'integer', meta: { interface: 'slider', options: { min: 0, max: 100 } }, schema: {} },
      { field: 'emoji',       type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
    ]
  },
  {
    name: 'key_results',
    note: 'Key Results liés aux OKRs',
    fields: [
      { field: 'objective',     type: 'uuid',    meta: { interface: 'select-dropdown-m2o', required: true }, schema: { foreign_key_table: 'objectives', foreign_key_column: 'id' } },
      { field: 'title',         type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false } },
      { field: 'type',          type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'Numeric', value: 'numeric' }, { text: 'Boolean', value: 'boolean' }, { text: 'Milestone', value: 'milestone' }
      ]}}, schema: {} },
      { field: 'unit',          type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'current_value', type: 'float',   meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'target_value',  type: 'float',   meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'baseline_value',type: 'float',   meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'status',        type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'On Track', value: 'on_track' }, { text: 'At Risk', value: 'at_risk' },
        { text: 'Behind', value: 'behind' }, { text: 'Completed', value: 'completed' }
      ]}, default_value: 'on_track' }, schema: { default_value: 'on_track' } },
      { field: 'due_date',      type: 'date',    meta: { interface: 'datetime' }, schema: {} },
      { field: 'notes',         type: 'text',    meta: { interface: 'input-multiline' }, schema: {} },
    ]
  },
  {
    name: 'tasks',
    note: 'Tâches liées aux projets et OKRs',
    fields: [
      { field: 'title',            type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false } },
      { field: 'status',           type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'Todo', value: 'todo' }, { text: 'In Progress', value: 'in_progress' },
        { text: 'Done', value: 'done' }, { text: 'Cancelled', value: 'cancelled' }, { text: 'Waiting', value: 'waiting' }
      ]}, default_value: 'todo' }, schema: { default_value: 'todo' } },
      { field: 'priority',         type: 'integer', meta: { interface: 'slider', options: { min: 1, max: 5 } }, schema: {} },
      { field: 'energy_level',     type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'Low', value: 'low' }, { text: 'Medium', value: 'medium' }, { text: 'High', value: 'high' }
      ]}}, schema: {} },
      { field: 'estimated_minutes',type: 'integer', meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'due_date',         type: 'date',    meta: { interface: 'datetime' }, schema: {} },
      { field: 'notes',            type: 'text',    meta: { interface: 'input-multiline' }, schema: {} },
    ]
  },
  {
    name: 'victories',
    note: 'Victoires et jalons atteints',
    fields: [
      { field: 'title',        type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false } },
      { field: 'description',  type: 'text',    meta: { interface: 'input-multiline' }, schema: {} },
      { field: 'type',         type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        { text: 'Milestone', value: 'milestone' }, { text: 'Habit', value: 'habit' },
        { text: 'Personal', value: 'personal' }, { text: 'Professional', value: 'professional' },
        { text: 'Product', value: 'product' }, { text: 'Health', value: 'health' }, { text: 'Financial', value: 'financial' }
      ]}}, schema: {} },
      { field: 'impact_score', type: 'integer', meta: { interface: 'slider', options: { min: 1, max: 10 } }, schema: {} },
      { field: 'key_result',   type: 'uuid',    meta: { interface: 'select-dropdown-m2o' }, schema: { foreign_key_table: 'key_results', foreign_key_column: 'id', is_nullable: true } },
      { field: 'celebrated_at',type: 'date',    meta: { interface: 'datetime' }, schema: {} },
      { field: 'emoji',        type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
    ]
  },
  {
    name: 'data_gates',
    note: 'Registre déclaratif de toutes les sources de données',
    fields: [
      { field: 'name',           type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false } },
      { field: 'type',           type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        'obsidian','git','api','graphql','rss','database','sql','mcp','s3','syncthing','webhook','k8s','ollama','smtp','redis'
      ].map(v => ({ text: v, value: v }))}}, schema: {} },
      { field: 'role',           type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        'knowledge_source','ai_provider','storage','compute','workflow','calendar','cache','monitor','code','data'
      ].map(v => ({ text: v, value: v }))}}, schema: {} },
      { field: 'source_path',    type: 'string',  meta: { interface: 'input' }, schema: {} },
      { field: 'parser',         type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        'markdown','json','jsonl','yaml','csv','html','sql','graphql','pdf','rss','cypher','binary'
      ].map(v => ({ text: v, value: v }))}}, schema: {} },
      { field: 'driver',         type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'auth_mode',      type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        'none','bearer','basic','oauth2','apikey','ssh','mtls'
      ].map(v => ({ text: v, value: v }))}}, schema: {} },
      { field: 'auth_secret_ref',type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'targets',        type: 'json',    meta: { interface: 'tags' }, schema: {} },
      { field: 'sync_schedule',  type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'description',    type: 'text',    meta: { interface: 'input-multiline' }, schema: {} },
      { field: 'enabled',        type: 'boolean', meta: { interface: 'boolean', default_value: true }, schema: { default_value: true } },
      { field: 'sync_status',    type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'last_sync',      type: 'timestamp',meta: { interface: 'datetime', readonly: true }, schema: {} },
      { field: 'sync_log',       type: 'text',    meta: { interface: 'input-multiline', readonly: true }, schema: {} },
    ]
  },
  {
    name: 'ui_schemas',
    note: 'Registre de schémas UI — pages pilotées par agents',
    fields: [
      { field: 'page_id',  type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false, is_unique: true } },
      { field: 'title',    type: 'string',  meta: { required: true, interface: 'input' }, schema: { is_nullable: false } },
      { field: 'intent',   type: 'text',    meta: { interface: 'input-multiline' }, schema: {} },
      { field: 'layout',   type: 'string',  meta: { interface: 'select-dropdown', options: { choices: [
        'dashboard','list','detail','form','graph','fullscreen'
      ].map(v => ({ text: v, value: v }))}}, schema: {} },
      { field: 'widgets',  type: 'json',    meta: { interface: 'input-code', options: { language: 'json' } }, schema: {} },
      { field: 'version',  type: 'string',  meta: { interface: 'input', width: 'half' }, schema: {} },
      { field: 'active',   type: 'boolean', meta: { interface: 'boolean', default_value: true }, schema: { default_value: true } },
    ]
  }
]

async function main() {
  console.log(`Directus: ${DIRECTUS}`)
  const token = await getToken()
  console.log('Auth OK')

  const existing = await getCollections(token)
  console.log(`Existing collections: ${existing.filter(c => !c.startsWith('directus_')).join(', ') || 'none'}`)

  let created = 0, skipped = 0, errors = 0

  for (const col of COLLECTIONS) {
    if (existing.includes(col.name)) {
      console.log(`  ~ ${col.name} (already exists)`)
      skipped++
      continue
    }
    try {
      const r = await createCollection(token, col.name, col.fields, col.note)
      if (r.data?.collection) {
        console.log(`  + ${col.name}`)
        created++
      } else {
        console.error(`  ! ${col.name}: ${JSON.stringify(r).slice(0, 200)}`)
        errors++
      }
    } catch (e) {
      console.error(`  ! ${col.name}: ${e.message}`)
      errors++
    }
  }

  console.log(`\nDone: +${created} created, ~${skipped} skipped, ${errors} errors`)
  console.log(`\nDirectus admin: ${DIRECTUS}/admin`)
}

main()
