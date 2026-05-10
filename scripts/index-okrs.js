#!/usr/bin/env node
/**
 * index-okrs.js — Index OKRs + KRs from PocketBase → Qdrant (collection: okrs)
 * Run via: docker exec sternos-soma node /opt/stern-os/scripts/index-okrs.js
 * Or:      make index-okrs (on stern-os-brain)
 *
 * Uses deterministic point IDs (md5 hash) so re-runs are idempotent.
 */

const PB_URL   = process.env.PB_URL            || 'http://sternos-pb:8090'
const PB_EMAIL = process.env.PB_ADMIN_EMAIL     || 'admin@ori3com.cloud'
const PB_PASS  = process.env.PB_ADMIN_PASSWORD  || 'SternOS2026!'
const QDRANT   = process.env.QDRANT_URL         || 'http://sternos-qdrant:6333'
const OAI_KEY  = process.env.LLM_API_KEY        || process.env.OPENAI_API_KEY || ''

const COLLECTION = 'okrs'

// ── Helpers ───────────────────────────────────────────────────────────────────

function md5Uuid(str) {
  // Simple deterministic UUID-like id from string (no crypto dep needed in Node 22)
  const { createHash } = await import('node:crypto').catch(() => null) || {}
  if (createHash) {
    const h = createHash('md5').update(str).digest('hex')
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`
  }
  // Fallback: simple hash
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0
  const hex = Math.abs(hash).toString(16).padStart(8, '0').repeat(4)
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`
}

async function pbAuth() {
  const r = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS })
  })
  const d = await r.json()
  if (!d.token) { console.error('PB auth failed:', d); process.exit(1) }
  return d.token
}

async function pbGet(path, token) {
  const r = await fetch(`${PB_URL}/api/${path}`, {
    headers: { Authorization: token }
  })
  return r.json()
}

async function embed(text) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OAI_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) })
  })
  const d = await r.json()
  if (!d.data?.[0]?.embedding) throw new Error('Embed failed: ' + JSON.stringify(d).slice(0, 200))
  return d.data[0].embedding
}

async function upsertPoint(id, vector, payload) {
  const r = await fetch(`${QDRANT}/collections/${COLLECTION}/points?wait=true`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points: [{ id, vector, payload }] })
  })
  const d = await r.json()
  if (d.status !== 'ok') throw new Error('Qdrant upsert failed: ' + JSON.stringify(d))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!OAI_KEY) { console.error('LLM_API_KEY or OPENAI_API_KEY required'); process.exit(1) }

  console.log(`PB: ${PB_URL} | Qdrant: ${QDRANT}`)
  const token = await pbAuth()
  console.log('PB auth OK')

  // Load objectives
  const okrRes = await pbGet('collections/objectives/records?perPage=200&filter=status!%3D"abandoned"', token)
  const okrs = okrRes.items || []
  console.log(`Loaded ${okrs.length} objectives`)

  // Load all KRs
  const krRes = await pbGet('collections/key_results/records?perPage=500', token)
  const allKrs = krRes.items || []
  console.log(`Loaded ${allKrs.length} key results`)

  let indexed = 0, errors = 0

  for (const okr of okrs) {
    const krs = allKrs.filter(kr => kr.objective === okr.id)

    // Index one point per KR (+ one summary point for the OKR itself if no KRs)
    const points = krs.length > 0 ? krs.map(kr => {
      const pct = kr.target_value && kr.target_value !== 0
        ? Math.round(((kr.current_value ?? 0) - (kr.baseline_value ?? 0)) / (kr.target_value - (kr.baseline_value ?? 0)) * 100)
        : 0
      return {
        text: `OKR: ${okr.title} | KR: ${kr.title} | Valeur: ${kr.current_value ?? 0}/${kr.target_value ?? '?'} ${kr.unit || ''} | Progression: ${pct}% | Statut KR: ${kr.status} | Statut OKR: ${okr.status} | Cycle: ${okr.okr_cycle || ''}`,
        payload: {
          okr_id: okr.id,
          okr_title: okr.title,
          okr_status: okr.status,
          okr_cycle: okr.okr_cycle || '',
          kr_id: kr.id,
          kr_title: kr.title,
          kr_status: kr.status,
          progress: pct,
          current_value: kr.current_value ?? 0,
          target_value: kr.target_value ?? 0,
          unit: kr.unit || '',
          indexed_at: new Date().toISOString()
        },
        id_key: `${okr.id}::${kr.id}`
      }
    }) : [{
      text: `OKR: ${okr.title} | ${okr.description || ''} | Statut: ${okr.status} | Cycle: ${okr.okr_cycle || ''}`,
      payload: {
        okr_id: okr.id,
        okr_title: okr.title,
        okr_status: okr.status,
        okr_cycle: okr.okr_cycle || '',
        kr_id: null,
        kr_title: null,
        indexed_at: new Date().toISOString()
      },
      id_key: `${okr.id}::summary`
    }]

    for (const pt of points) {
      try {
        // Deterministic UUID-like id from hash
        const { createHash } = await import('node:crypto')
        const h = createHash('md5').update(pt.id_key).digest('hex')
        const pointId = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`

        const vector = await embed(pt.text)
        await upsertPoint(pointId, vector, pt.payload)
        process.stdout.write('+')
        indexed++
      } catch (e) {
        process.stdout.write('E')
        errors++
        console.error(`\nError on ${pt.id_key}:`, e.message)
      }
    }
  }

  console.log(`\n\nDone: ${indexed} points indexed, ${errors} errors`)
}

main()
