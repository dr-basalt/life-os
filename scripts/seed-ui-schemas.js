#!/usr/bin/env node
/**
 * seed-ui-schemas.js — Seed UI Schema registry in PocketBase
 * Run via: docker exec sternos-soma node /opt/stern-os/scripts/seed-ui-schemas.js
 * Or:      make seed-ui-schemas (on stern-os-brain)
 *
 * Idempotent — upserts by page_id.
 * Defines 4 canonical pages aligned with OKR Engine + META_MODEL invariant_widgets.
 */

const PB    = process.env.PB_URL            || 'http://sternos-pb:8090'
const EMAIL = process.env.PB_ADMIN_EMAIL    || 'admin@ori3com.cloud'
const PASS  = process.env.PB_ADMIN_PASSWORD || 'SternOS2026!'

const MCP = 'https://mcp.stern-os.ori3com.cloud'

const SCHEMAS = [
  // ── OKR Dashboard ─────────────────────────────────────────────────────────
  {
    page_id: 'okr_dashboard',
    title: 'Cockpit OKR',
    intent: 'Vue synthétique des objectifs actifs, priorités du jour, victoires récentes et actions recommandées',
    layout: 'dashboard',
    version: '1.0.0',
    active: true,
    widgets: [
      {
        id: 'p0_priority',
        type: 'priority_card',
        title: 'Priorité du jour',
        span: 12,
        source: '/tools/get_roadmap'
      },
      {
        id: 'active_okrs',
        type: 'okr_progress',
        title: 'OKRs actifs',
        span: 8,
        source: '/tools/get_okrs',
        filter: { status: 'active' }
      },
      {
        id: 'recent_victories',
        type: 'victory_timeline',
        title: 'Victoires récentes',
        span: 4,
        source: 'pb:victories',
        filter: { sort: '-created', perPage: 5 }
      },
      {
        id: 'recommended_actions',
        type: 'action_list',
        title: 'Actions recommandées',
        span: 12,
        source: '/tools/get_roadmap'
      }
    ]
  },

  // ── OKR Detail ────────────────────────────────────────────────────────────
  {
    page_id: 'okr_detail',
    title: 'Détail OKR',
    intent: 'Vue complète d\'un OKR: KRs imbriqués, tâches liées, victoires, contexte sémantique du vault',
    layout: 'detail',
    version: '1.0.0',
    active: true,
    widgets: [
      {
        id: 'okr_header',
        type: 'okr_progress',
        title: 'Objectif',
        span: 12,
        source: '/tools/get_okr_detail',
        param: 'id'
      },
      {
        id: 'kr_list',
        type: 'action_list',
        title: 'Key Results',
        span: 6,
        source: '/tools/get_okr_detail',
        param: 'id',
        filter: { section: 'key_results' }
      },
      {
        id: 'linked_tasks',
        type: 'action_list',
        title: 'Tâches liées',
        span: 6,
        source: '/tools/get_okr_detail',
        param: 'id',
        filter: { section: 'tasks' }
      },
      {
        id: 'semantic_context',
        type: 'search_results',
        title: 'Contexte sémantique',
        span: 8,
        source: '/tools/semantic_search',
        filter: { collection: 'okrs', top_k: 5 }
      },
      {
        id: 'okr_victories',
        type: 'victory_timeline',
        title: 'Victoires liées',
        span: 4,
        source: '/tools/get_okr_detail',
        param: 'id',
        filter: { section: 'victories' }
      }
    ]
  },

  // ── Graph View ────────────────────────────────────────────────────────────
  {
    page_id: 'graph_view',
    title: 'Graphe Persona',
    intent: 'Visualisation du graphe cognitif Neo4j: User → Douleurs → P0 → OKRs → Niches → Désirs',
    layout: 'graph',
    version: '1.0.0',
    active: true,
    widgets: [
      {
        id: 'persona_graph',
        type: 'graph_view',
        title: 'Graphe cognitif',
        span: 8,
        source: '/tools/get_context',
        actions: [
          { label: 'Filtrer Douleurs', filter: 'Douleur' },
          { label: 'Filtrer OKRs', filter: 'OKR' },
          { label: 'Filtrer Désirs', filter: 'Desir' }
        ]
      },
      {
        id: 'roadmap_graph',
        type: 'okr_progress',
        title: 'Roadmap OKRs',
        span: 4,
        source: '/tools/get_roadmap'
      }
    ]
  },

  // ── Daily Briefing ────────────────────────────────────────────────────────
  {
    page_id: 'daily_briefing',
    title: 'Briefing quotidien',
    intent: 'Synthèse journalière: P0 du jour, KRs à risque, insights du vault, actions recommandées',
    layout: 'dashboard',
    version: '1.0.0',
    active: true,
    widgets: [
      {
        id: 'briefing_p0',
        type: 'priority_card',
        title: 'P0 du jour',
        span: 12,
        source: '/tools/get_daily_briefing'
      },
      {
        id: 'blockers',
        type: 'blocker_map',
        title: 'KRs at risk',
        span: 6,
        source: '/tools/get_daily_briefing',
        filter: { section: 'at_risk_krs' }
      },
      {
        id: 'vault_insights',
        type: 'search_results',
        title: 'Insights vault',
        span: 6,
        source: '/tools/semantic_search',
        filter: { collection: 'insights', top_k: 5 },
        query_from_okr: true
      },
      {
        id: 'briefing_actions',
        type: 'action_list',
        title: 'Actions recommandées',
        span: 12,
        source: '/tools/get_daily_briefing',
        filter: { section: 'recommended_actions' }
      }
    ]
  }
]

async function main() {
  console.log(`PB: ${PB}`)
  const authRes = await fetch(`${PB}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  })
  const auth = await authRes.json()
  const token = auth.token
  if (!token) { console.error('Auth failed:', auth); process.exit(1) }
  console.log(`Auth OK — seeding ${SCHEMAS.length} UI schemas...\n`)

  let created = 0, updated = 0, errors = 0

  for (const schema of SCHEMAS) {
    try {
      const enc = encodeURIComponent(`page_id="${schema.page_id}"`)
      const list = await (await fetch(`${PB}/api/collections/ui_schemas/records?filter=${enc}&perPage=1`, {
        headers: { Authorization: token }
      })).json()
      const existing = list.items?.[0]

      if (existing) {
        const r = await (await fetch(`${PB}/api/collections/ui_schemas/records/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify(schema)
        })).json()
        if (r.id) { process.stdout.write('~'); updated++ }
        else { process.stdout.write('E'); errors++; console.error(`\nPATCH ERR ${schema.page_id}:`, JSON.stringify(r).slice(0, 200)) }
      } else {
        const r = await (await fetch(`${PB}/api/collections/ui_schemas/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify(schema)
        })).json()
        if (r.id) { process.stdout.write('+'); created++ }
        else { process.stdout.write('E'); errors++; console.error(`\nPOST ERR ${schema.page_id}:`, JSON.stringify(r).slice(0, 200)) }
      }
    } catch (e) {
      process.stdout.write('!')
      errors++
      console.error(`\nERR ${schema.page_id}:`, e.message)
    }
  }

  console.log(`\n\nDone: +${created} created, ~${updated} updated, ${errors} errors`)
}

main()
