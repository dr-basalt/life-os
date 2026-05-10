#!/usr/bin/env node
/**
 * migrate-pb-to-directus.js
 * Exports data from PocketBase and imports into Directus.
 * Idempotent — skips records that already exist by title/name.
 * Run: docker exec sternos-soma node /opt/stern-os/scripts/migrate-pb-to-directus.js
 */

const PB_URL = process.env.POCKETBASE_URL || 'http://sternos-pb:8090'
const PB_ADMIN = process.env.PB_ADMIN_EMAIL || 'admin@stern-os.local'
const PB_PASS = process.env.PB_ADMIN_PASSWORD || ''

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://sternos-directus:8055'
const DIRECTUS_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@stern-os.local'
const DIRECTUS_PASS = process.env.DIRECTUS_ADMIN_PASSWORD || ''

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_ADMIN, password: PB_PASS }),
  })
  if (!res.ok) throw new Error(`PocketBase auth failed: ${res.status}`)
  const data = await res.json()
  return data.token
}

async function pbList(token, collection, page = 1, perPage = 200) {
  const res = await fetch(
    `${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=${perPage}&expand=objective`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    console.warn(`  PocketBase ${collection} fetch failed (${res.status}), skipping`)
    return []
  }
  const data = await res.json()
  return data.items || data.records || []
}

async function directusAuth() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DIRECTUS_EMAIL, password: DIRECTUS_PASS }),
  })
  if (!res.ok) throw new Error(`Directus auth failed: ${res.status}`)
  const data = await res.json()
  return data.data.access_token
}

async function directusGet(token, collection) {
  const res = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=-1&fields=id,title,name`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.data || []
}

async function directusCreate(token, collection, body) {
  const res = await fetch(`${DIRECTUS_URL}/items/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`  Directus create ${collection} failed: ${err}`)
    return null
  }
  return (await res.json()).data
}

// ──────────────────────────────────────────────
// Migration functions
// ──────────────────────────────────────────────

async function migrateObjectives(pbToken, dToken) {
  console.log('\n▶ objectives')
  const records = await pbList(pbToken, 'objectives')
  const existing = await directusGet(dToken, 'objectives')
  const existingTitles = new Set(existing.map(e => e.title))
  const idMap = new Map() // pb_id → directus_id

  for (const r of records) {
    if (existingTitles.has(r.title)) {
      const ex = existing.find(e => e.title === r.title)
      if (ex) idMap.set(r.id, ex.id)
      console.log(`  skip (exists): ${r.title}`)
      continue
    }
    const created = await directusCreate(dToken, 'objectives', {
      title: r.title,
      description: r.description || null,
      type: r.type || 'business',
      status: r.status || 'active',
      okr_cycle: r.okr_cycle || null,
      deadline: r.deadline || null,
      confidence: r.confidence || null,
      emoji: r.emoji || null,
    })
    if (created) {
      idMap.set(r.id, created.id)
      console.log(`  ✓ ${r.title}`)
    }
  }

  return idMap
}

async function migrateKeyResults(pbToken, dToken, objIdMap) {
  console.log('\n▶ key_results')
  const records = await pbList(pbToken, 'key_results')
  const existing = await directusGet(dToken, 'key_results')
  const existingTitles = new Set(existing.map(e => e.title))

  for (const r of records) {
    if (existingTitles.has(r.title)) {
      console.log(`  skip (exists): ${r.title}`)
      continue
    }
    const directusObjId = objIdMap.get(r.objective)
    if (!directusObjId) {
      console.warn(`  skip (no matching objective): ${r.title}`)
      continue
    }
    await directusCreate(dToken, 'key_results', {
      objective: directusObjId,
      title: r.title,
      type: r.type || 'numeric',
      unit: r.unit || null,
      current_value: r.current_value ?? null,
      target_value: r.target_value ?? null,
      baseline_value: r.baseline_value ?? null,
      confidence: r.confidence ?? null,
      status: r.status || 'on_track',
      due_date: r.due_date || null,
      notes: r.notes || null,
    })
    console.log(`  ✓ ${r.title}`)
  }
}

async function migrateTasks(pbToken, dToken) {
  console.log('\n▶ tasks')
  const records = await pbList(pbToken, 'tasks')
  const existing = await directusGet(dToken, 'tasks')
  const existingTitles = new Set(existing.map(e => e.title))

  for (const r of records) {
    if (existingTitles.has(r.title)) {
      console.log(`  skip (exists): ${r.title}`)
      continue
    }
    await directusCreate(dToken, 'tasks', {
      title: r.title,
      status: r.status || 'todo',
      priority: r.priority ?? null,
      energy_level: r.energy_level || null,
      estimated_minutes: r.estimated_minutes ?? null,
      due_date: r.due_date || null,
      notes: r.notes || null,
    })
    console.log(`  ✓ ${r.title}`)
  }
}

async function migrateVictories(pbToken, dToken, objIdMap) {
  console.log('\n▶ victories')
  const records = await pbList(pbToken, 'victories')
  const existing = await directusGet(dToken, 'victories')
  const existingTitles = new Set(existing.map(e => e.title))

  for (const r of records) {
    if (existingTitles.has(r.title)) {
      console.log(`  skip (exists): ${r.title}`)
      continue
    }
    await directusCreate(dToken, 'victories', {
      title: r.title,
      type: r.type || 'milestone',
      impact: r.impact || 'medium',
      date: r.date || new Date().toISOString().slice(0, 10),
      description: r.description || null,
      objective: objIdMap.get(r.objective) || null,
      emoji: r.emoji || null,
    })
    console.log(`  ✓ ${r.title}`)
  }
}

async function migrateDataGates(pbToken, dToken) {
  console.log('\n▶ data_gates')
  const records = await pbList(pbToken, 'data_gates')
  const existing = await directusGet(dToken, 'data_gates')
  const existingNames = new Set(existing.map(e => e.name))

  for (const r of records) {
    if (existingNames.has(r.name)) {
      console.log(`  skip (exists): ${r.name}`)
      continue
    }
    await directusCreate(dToken, 'data_gates', {
      name: r.name,
      type: r.type || 'api',
      status: r.status || 'pending',
      url: r.url || null,
      description: r.description || null,
      last_sync: r.last_sync || null,
      sync_interval_minutes: r.sync_interval_minutes ?? null,
      config: r.config || null,
      error_message: r.error_message || null,
    })
    console.log(`  ✓ ${r.name}`)
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════╗')
  console.log('║  PocketBase → Directus Migration      ║')
  console.log('╚═══════════════════════════════════════╝')

  let pbToken
  try {
    pbToken = await pbAuth()
    console.log('✓ PocketBase authenticated')
  } catch (err) {
    console.error('✗ PocketBase auth failed:', err.message)
    process.exit(1)
  }

  let dToken
  try {
    dToken = await directusAuth()
    console.log('✓ Directus authenticated')
  } catch (err) {
    console.error('✗ Directus auth failed:', err.message)
    process.exit(1)
  }

  const objIdMap = await migrateObjectives(pbToken, dToken)
  await migrateKeyResults(pbToken, dToken, objIdMap)
  await migrateTasks(pbToken, dToken)
  await migrateVictories(pbToken, dToken, objIdMap)
  await migrateDataGates(pbToken, dToken)

  console.log('\n✅ Migration terminée')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
