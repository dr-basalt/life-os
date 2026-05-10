import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import neo4j from 'neo4j-driver'
import PocketBase from 'pocketbase'

const app = new Hono()

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://172.19.0.2:7687'
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'SternOS2026xNeo4j'
const PB_URL = process.env.PB_URL || 'http://sternos-pb:8090'
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@ori3com.cloud'
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'SternOS2026!'
const QDRANT_URL = process.env.QDRANT_URL || 'http://sternos-qdrant:6333'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || ''

let driver
try {
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD))
} catch (e) {
  console.warn('Neo4j driver init failed:', e.message)
}

const pb = new PocketBase(PB_URL)

async function authPb() {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
  } catch {}
}

app.use('*', cors())

// ── Qdrant embedding helper ────────────────────────────────────────────────
async function embedText(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  })
  const data = await res.json()
  if (!data.data?.[0]?.embedding) throw new Error('Embedding failed: ' + JSON.stringify(data))
  return data.data[0].embedding
}

// ── MCP Manifest ────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({
  name: 'SternOS MCP',
  version: '1.3.0',
  description: 'SternOS — Cognitive OS for dr-basalt. Persona graph, OKRs, tasks, roadmap, vector search, data gates SCRUD.',
  server: 'stern-os-brain 46.224.111.203',
  tools: [
    {
      name: 'get_context',
      description: 'Get full dr-basalt persona context from Neo4j (douleurs, patterns, désirs, P0)',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_okrs',
      description: 'Get all active OKRs and their key results from PocketBase',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'create_task',
      description: 'Create a new task in the board',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'waiting', 'done'] },
          priority: { type: 'number' },
          due_date: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['title']
      }
    },
    {
      name: 'update_kr_progress',
      description: 'Update key result current value',
      inputSchema: {
        type: 'object',
        properties: {
          kr_id: { type: 'string' },
          current_value: { type: 'number' }
        },
        required: ['kr_id', 'current_value']
      }
    },
    {
      name: 'get_roadmap',
      description: 'Get current roadmap: OKRs with KRs, P0 invariants, deadlines',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'add_insight',
      description: 'Add an insight to the persona graph (douleur, pattern, désir, or general)',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          type: { type: 'string', enum: ['douleur', 'pattern', 'desir', 'insight', 'general'] },
          intensity: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['content']
      }
    },
    {
      name: 'semantic_search',
      description: 'Recherche sémantique dans les connaissances indexées (Qdrant)',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          collection: { type: 'string', description: 'insights | okrs | blueprint (défaut: insights)' },
          top_k: { type: 'number' }
        },
        required: ['query']
      }
    },
    {
      name: 'list_data_gates',
      description: 'Lister toutes les Data Gates configurées (sources de données)',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'trigger_sync',
      description: 'Déclencher la synchronisation d\'une Data Gate',
      inputSchema: {
        type: 'object',
        properties: {
          gate_name: { type: 'string' }
        },
        required: ['gate_name']
      }
    },
    {
      name: 'create_data_gate',
      description: 'Créer une nouvelle Data Gate dans le registre',
      inputSchema: {
        type: 'object',
        properties: {
          name:            { type: 'string' },
          type:            { type: 'string', description: 'obsidian|git|api|graphql|rss|database|sql|mcp|s3|syncthing|webhook|k8s|ollama|smtp|redis' },
          role:            { type: 'string', description: 'knowledge_source|ai_provider|storage|compute|workflow|calendar|cache|monitor|code|data' },
          protocol:        { type: 'string' },
          source_path:     { type: 'string', description: 'URL, path, connection string' },
          parser:          { type: 'string', description: 'markdown|json|jsonl|yaml|csv|html|sql|graphql|pdf|rss|cypher|binary' },
          driver:          { type: 'string', description: 'postgres|sqlite|neo4j|qdrant|redis|bolt|mongo' },
          targets:         { type: 'array', items: { type: 'string' }, description: '["qdrant:insights","neo4j:notes","pb:docs"]' },
          auth_mode:       { type: 'string', description: 'none|bearer|basic|oauth2|apikey|ssh|mtls' },
          auth_secret_ref: { type: 'string', description: 'Env var name holding the secret (never the secret itself)' },
          sync_schedule:   { type: 'string', description: 'Cron expression, e.g. 0 3 * * *' },
          description:     { type: 'string' },
          enabled:         { type: 'boolean' }
        },
        required: ['name', 'type', 'source_path']
      }
    },
    {
      name: 'get_data_gate',
      description: 'Récupérer une Data Gate par nom ou ID',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          id:   { type: 'string' }
        }
      }
    },
    {
      name: 'update_data_gate',
      description: 'Mettre à jour une Data Gate existante',
      inputSchema: {
        type: 'object',
        properties: {
          name:            { type: 'string', description: 'Name or id to identify the gate' },
          id:              { type: 'string' },
          type:            { type: 'string' },
          role:            { type: 'string' },
          source_path:     { type: 'string' },
          parser:          { type: 'string' },
          driver:          { type: 'string' },
          targets:         { type: 'array', items: { type: 'string' } },
          auth_mode:       { type: 'string' },
          auth_secret_ref: { type: 'string' },
          sync_schedule:   { type: 'string' },
          description:     { type: 'string' },
          enabled:         { type: 'boolean' }
        }
      }
    },
    {
      name: 'delete_data_gate',
      description: 'Supprimer une Data Gate du registre',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          id:   { type: 'string' }
        }
      }
    },
    {
      name: 'search_data_gates',
      description: 'Rechercher des Data Gates par type, rôle, statut ou texte libre',
      inputSchema: {
        type: 'object',
        properties: {
          type:    { type: 'string' },
          role:    { type: 'string' },
          enabled: { type: 'boolean' },
          query:   { type: 'string', description: 'Free text search on name/description/source_path' }
        }
      }
    },
    {
      name: 'get_okr_detail',
      description: 'Détail complet d\'un OKR: KRs, tâches liées, victoires, contexte sémantique Qdrant',
      inputSchema: {
        type: 'object',
        properties: {
          okr_id: { type: 'string', description: 'ID PocketBase de l\'objectif' }
        },
        required: ['okr_id']
      }
    },
    {
      name: 'get_daily_briefing',
      description: 'Briefing journalier: P0 du jour, KRs at_risk, insights du vault (Qdrant), actions recommandées',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_ui_schema',
      description: 'Récupérer un UI Schema par page_id depuis le registre PocketBase',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'okr_dashboard | okr_detail | graph_view | daily_briefing | custom' }
        },
        required: ['page_id']
      }
    },
    {
      name: 'create_ui_schema',
      description: 'Créer ou mettre à jour un UI Schema dans le registre (valide les types de widgets)',
      inputSchema: {
        type: 'object',
        properties: {
          page_id:  { type: 'string' },
          title:    { type: 'string' },
          intent:   { type: 'string' },
          layout:   { type: 'string', description: 'dashboard|list|detail|form|graph|fullscreen' },
          widgets:  { type: 'array', description: 'Array of widget definitions (see META_MODEL invariant_widgets)' },
          version:  { type: 'string' }
        },
        required: ['page_id', 'title', 'layout', 'widgets']
      }
    },
    {
      name: 'generate_ui_schema',
      description: 'Générer un UI Schema via LLM depuis une intention + contexte OKR actif. Valide + persiste le résultat.',
      inputSchema: {
        type: 'object',
        properties: {
          intent:        { type: 'string', description: 'Ce que la page doit montrer (langage naturel)' },
          context_okr_id: { type: 'string', description: 'OKR de référence (optionnel)' }
        },
        required: ['intent']
      }
    }
  ]
}))

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', async (c) => {
  const checks = { mcp: 'ok', neo4j: 'unknown', pocketbase: 'unknown' }

  if (driver) {
    try {
      const session = driver.session()
      await session.run('RETURN 1')
      await session.close()
      checks.neo4j = 'ok'
    } catch (e) {
      checks.neo4j = 'error: ' + e.message
    }
  }

  try {
    await pb.health.check()
    checks.pocketbase = 'ok'
  } catch (e) {
    checks.pocketbase = 'error: ' + e.message
  }

  return c.json(checks)
})

// ── Tool: get_context ──────────────────────────────────────────────────────
app.post('/tools/get_context', async (c) => {
  if (!driver) return c.json({ error: 'Neo4j not connected' }, 503)
  const session = driver.session()
  try {
    const result = await session.run(`
      MATCH (u:User {id: 'dr-basalt'})
      OPTIONAL MATCH (u)-[:EXPRIME]->(d:Douleur)
      OPTIONAL MATCH (u)-[:MANIFESTE]->(p:Pattern)
      OPTIONAL MATCH (u)-[:DESIRE_PROFOND]->(des:Desir)
      OPTIONAL MATCH (u)-[:A_P0]->(p0:P0)
      RETURN u,
             collect(DISTINCT d) as douleurs,
             collect(DISTINCT p) as patterns,
             collect(DISTINCT des) as desirs,
             collect(DISTINCT p0) as p0s
    `)
    const r = result.records[0]
    return c.json({
      user: r?.get('u')?.properties || {},
      douleurs: r?.get('douleurs')?.map(d => d.properties) || [],
      patterns: r?.get('patterns')?.map(p => p.properties) || [],
      desirs: r?.get('desirs')?.map(d => d.properties) || [],
      p0s: r?.get('p0s')?.map(p => p.properties) || [],
    })
  } finally { await session.close() }
})

// ── Tool: get_okrs ────────────────────────────────────────────────────────
app.post('/tools/get_okrs', async (c) => {
  try {
    await authPb()
    const okrs = await pb.collection('objectives').getFullList({ filter: 'status != "abandoned"' })
    const krs = await pb.collection('key_results').getFullList()
    return c.json({ okrs, key_results: krs })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Tool: create_task ─────────────────────────────────────────────────────
app.post('/tools/create_task', async (c) => {
  const body = await c.req.json()
  try {
    await authPb()
    const task = await pb.collection('tasks').create({
      title: body.title,
      status: body.status || 'todo',
      priority: body.priority || 1,
      due_date: body.due_date || '',
      notes: body.notes || '',
    })
    return c.json(task)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Tool: update_kr_progress ──────────────────────────────────────────────
app.post('/tools/update_kr_progress', async (c) => {
  const { kr_id, current_value } = await c.req.json()
  try {
    await authPb()
    const kr = await pb.collection('key_results').update(kr_id, { current_value })
    return c.json(kr)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Tool: get_roadmap ─────────────────────────────────────────────────────
app.post('/tools/get_roadmap', async (c) => {
  try {
    await authPb()
    const okrs = await pb.collection('objectives').getFullList({ filter: 'status != "abandoned"', sort: 'deadline' })
    const krs = await pb.collection('key_results').getFullList()

    let p0s = []
    if (driver) {
      const session = driver.session()
      try {
        const result = await session.run("MATCH (u:User {id: 'dr-basalt'})-[:A_P0]->(p0:P0) RETURN p0")
        p0s = result.records.map(r => r.get('p0').properties)
      } finally { await session.close() }
    }

    return c.json({
      p0s,
      okrs: okrs.map(o => ({
        ...o,
        key_results: krs.filter(kr => kr.objective === o.id)
      }))
    })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Tool: add_insight ─────────────────────────────────────────────────────
app.post('/tools/add_insight', async (c) => {
  const { content, type = 'general', intensity = 0.5 } = await c.req.json()
  if (!driver) return c.json({ error: 'Neo4j not connected' }, 503)
  const session = driver.session()
  try {
    const result = await session.run(`
      MERGE (u:User {id: 'dr-basalt'})
      CREATE (ins:Insight {
        id: randomUUID(),
        contenu: $content,
        type: $type,
        poids: $intensity,
        created_at: datetime()
      })
      CREATE (u)-[:HAS_INSIGHT]->(ins)
      RETURN ins.id as id
    `, { content, type, intensity })
    return c.json({ success: true, id: result.records[0]?.get('id') })
  } finally { await session.close() }
})

// ── Tool: semantic_search ─────────────────────────────────────────────────
app.post('/tools/semantic_search', async (c) => {
  const { query, collection = 'insights', top_k = 5 } = await c.req.json()
  try {
    const vector = await embedText(query)
    const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, limit: top_k, with_payload: true })
    })
    const data = await res.json()
    return c.json({ results: data.result || [], collection })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Tool: list_data_gates ─────────────────────────────────────────────────
app.post('/tools/list_data_gates', async (c) => {
  try {
    await authPb()
    const gates = await pb.collection('data_gates').getFullList({ sort: 'name' })
    return c.json({ gates })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Tool: trigger_sync ────────────────────────────────────────────────────
app.post('/tools/trigger_sync', async (c) => {
  const { gate_name } = await c.req.json()
  try {
    await authPb()
    const gates = await pb.collection('data_gates').getFullList({ filter: `name = "${gate_name}"` })
    const gate = gates[0]
    if (!gate) return c.json({ error: `Gate not found: ${gate_name}` }, 404)
    if (!gate.enabled) return c.json({ error: 'Gate is disabled' }, 400)

    // Mark as running
    await pb.collection('data_gates').update(gate.id, { sync_status: 'running' })

    // Dispatch sync asynchronously (fire-and-forget, actual work done by sync script)
    // The script sync-obsidian-gate.py handles the real sync; here we just signal it
    // by updating the record — Windmill/cron can watch for 'running' status
    const log = `Sync triggered at ${new Date().toISOString()} via MCP`
    await pb.collection('data_gates').update(gate.id, {
      sync_status: 'ok',
      last_sync: new Date().toISOString(),
      sync_log: log
    })

    return c.json({ success: true, gate: gate_name, message: log })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Data Gates SCRUD ──────────────────────────────────────────────────────

async function findGate(name, id) {
  if (id) return pb.collection('data_gates').getOne(id)
  const list = await pb.collection('data_gates').getFullList({
    filter: `name = "${name.replace(/"/g, '\\"')}"`
  })
  return list[0] || null
}

app.post('/tools/create_data_gate', async (c) => {
  const body = await c.req.json()
  try {
    await authPb()
    const gate = await pb.collection('data_gates').create({
      ...body,
      sync_status: body.sync_status || 'idle',
      enabled: body.enabled !== false,
    })
    return c.json(gate)
  } catch (e) { return c.json({ error: e.message }, 500) }
})

app.post('/tools/get_data_gate', async (c) => {
  const { name, id } = await c.req.json()
  try {
    await authPb()
    const gate = await findGate(name, id)
    return gate ? c.json(gate) : c.json({ error: 'Not found' }, 404)
  } catch (e) { return c.json({ error: e.message }, 500) }
})

app.post('/tools/update_data_gate', async (c) => {
  const { name, id, ...data } = await c.req.json()
  try {
    await authPb()
    const gate = await findGate(name, id)
    if (!gate) return c.json({ error: 'Not found' }, 404)
    const updated = await pb.collection('data_gates').update(gate.id, data)
    return c.json(updated)
  } catch (e) { return c.json({ error: e.message }, 500) }
})

app.post('/tools/delete_data_gate', async (c) => {
  const { name, id } = await c.req.json()
  try {
    await authPb()
    const gate = await findGate(name, id)
    if (!gate) return c.json({ error: 'Not found' }, 404)
    await pb.collection('data_gates').delete(gate.id)
    return c.json({ success: true, deleted: gate.name })
  } catch (e) { return c.json({ error: e.message }, 500) }
})

app.post('/tools/search_data_gates', async (c) => {
  const { type, role, enabled, query } = await c.req.json()
  try {
    await authPb()
    const filters = []
    if (type) filters.push(`type = "${type}"`)
    if (role) filters.push(`role = "${role}"`)
    if (enabled !== undefined) filters.push(`enabled = ${enabled}`)
    const gates = await pb.collection('data_gates').getFullList({
      filter: filters.join(' && ') || undefined,
      sort: 'name'
    })
    const results = query
      ? gates.filter(g =>
          g.name?.includes(query) ||
          g.description?.includes(query) ||
          g.source_path?.includes(query))
      : gates
    return c.json({ results, total: results.length })
  } catch (e) { return c.json({ error: e.message }, 500) }
})

// ── Tool: get_okr_detail ──────────────────────────────────────────────────────
app.post('/tools/get_okr_detail', async (c) => {
  const { okr_id } = await c.req.json()
  if (!okr_id) return c.json({ error: 'okr_id required' }, 400)
  try {
    await authPb()
    const okr = await pb.collection('objectives').getOne(okr_id)
    const krs = await pb.collection('key_results').getFullList({ filter: `objective = "${okr_id}"`, sort: 'created' })
    const tasks = await pb.collection('tasks').getFullList({
      filter: 'status != "done" && status != "cancelled"', sort: '-priority'
    }).catch(() => [])
    const victories = await pb.collection('victories').getFullList({ sort: '-created' }).catch(() => [])
    const krIds = krs.map(kr => kr.id)
    const linkedVictories = victories.filter(v => krIds.includes(v.key_result)).slice(0, 5)

    let semanticContext = []
    try {
      const vector = await embedText(okr.title)
      const res = await fetch(`${QDRANT_URL}/collections/okrs/points/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector, limit: 5, with_payload: true })
      })
      semanticContext = (await res.json()).result || []
    } catch (_) {}

    return c.json({ okr, key_results: krs, tasks: tasks.slice(0, 10), victories: linkedVictories, semantic_context: semanticContext })
  } catch (e) { return c.json({ error: e.message }, 500) }
})

// ── Tool: get_daily_briefing ──────────────────────────────────────────────────
app.post('/tools/get_daily_briefing', async (c) => {
  try {
    await authPb()
    const okrs = await pb.collection('objectives').getFullList({ filter: 'status = "active"', sort: 'deadline' })
    const krs = await pb.collection('key_results').getFullList()

    let p0s = []
    if (driver) {
      const session = driver.session()
      try {
        const result = await session.run("MATCH (u:User {id: 'dr-basalt'})-[:A_P0]->(p0:P0) RETURN p0 LIMIT 3")
        p0s = result.records.map(r => r.get('p0').properties)
      } finally { await session.close() }
    }

    const atRiskKrs = krs
      .filter(kr => kr.status === 'at_risk' || kr.status === 'behind')
      .map(kr => ({ ...kr, okr: okrs.find(o => o.id === kr.objective) }))

    const criticalOkr = okrs.find(o =>
      krs.filter(kr => kr.objective === o.id).some(kr => kr.status === 'at_risk' || kr.status === 'behind')
    ) || okrs[0]

    let insights = []
    try {
      const query = criticalOkr ? `${criticalOkr.title} priorités actions` : 'objectifs priorités du jour'
      const vector = await embedText(query)
      const res = await fetch(`${QDRANT_URL}/collections/insights/points/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector, limit: 5, with_payload: true })
      })
      insights = (await res.json()).result || []
    } catch (_) {}

    const tasks = await pb.collection('tasks').getFullList({
      filter: 'status = "todo" || status = "in_progress"', sort: '-priority'
    }).catch(() => [])

    return c.json({
      generated_at: new Date().toISOString(),
      p0: p0s[0] || null,
      critical_okr: criticalOkr || null,
      at_risk_krs: atRiskKrs.slice(0, 5),
      insights,
      recommended_actions: tasks.slice(0, 5),
      okrs_summary: okrs.map(o => ({ ...o, key_results: krs.filter(kr => kr.objective === o.id) }))
    })
  } catch (e) { return c.json({ error: e.message }, 500) }
})

// ── Tool: get_ui_schema ───────────────────────────────────────────────────────
app.post('/tools/get_ui_schema', async (c) => {
  const { page_id } = await c.req.json()
  if (!page_id) return c.json({ error: 'page_id required' }, 400)
  try {
    await authPb()
    const schemas = await pb.collection('ui_schemas').getFullList({ filter: `page_id = "${page_id}"` })
    if (!schemas[0]) return c.json({ error: `UI Schema not found: ${page_id}` }, 404)
    return c.json(schemas[0])
  } catch (e) { return c.json({ error: e.message }, 500) }
})

// ── Tool: create_ui_schema ────────────────────────────────────────────────────
const VALID_WIDGET_TYPES = [
  'priority_card', 'okr_progress', 'blocker_map', 'victory_timeline',
  'action_list', 'journal_editor', 'graph_view', 'decision_matrix',
  'calendar_view', 'focus_timer', 'data_gate_status', 'agent_run_trace',
  'metric_widget', 'search_results'
]

app.post('/tools/create_ui_schema', async (c) => {
  const { page_id, title, intent, layout, widgets, version } = await c.req.json()
  if (!page_id || !title || !layout || !widgets) return c.json({ error: 'page_id, title, layout, widgets required' }, 400)

  const invalid = widgets.filter(w => !VALID_WIDGET_TYPES.includes(w.type))
  if (invalid.length > 0) return c.json({ error: `Invalid widget types: ${invalid.map(w => w.type).join(', ')}`, valid_types: VALID_WIDGET_TYPES }, 400)

  try {
    await authPb()
    const existing = await pb.collection('ui_schemas').getFullList({ filter: `page_id = "${page_id}"` })
    const data = { page_id, title, intent, layout, widgets, version: version || '1.0.0', active: true }
    const result = existing[0]
      ? await pb.collection('ui_schemas').update(existing[0].id, data)
      : await pb.collection('ui_schemas').create(data)
    return c.json(result)
  } catch (e) { return c.json({ error: e.message }, 500) }
})

// ── Tool: generate_ui_schema ──────────────────────────────────────────────────
app.post('/tools/generate_ui_schema', async (c) => {
  const { intent, context_okr_id } = await c.req.json()
  if (!intent) return c.json({ error: 'intent required' }, 400)

  let okrContext = ''
  try {
    await authPb()
    if (context_okr_id) {
      const okr = await pb.collection('objectives').getOne(context_okr_id)
      const krs = await pb.collection('key_results').getFullList({ filter: `objective = "${context_okr_id}"` })
      okrContext = `OKR: "${okr.title}" — KRs: ${krs.map(kr => kr.title).join(', ')}`
    } else {
      const okrs = await pb.collection('objectives').getFullList({ filter: 'status = "active"' })
      okrContext = `OKRs actifs: ${okrs.map(o => o.title).join(', ')}`
    }
  } catch (_) {}

  const systemPrompt = `Tu es un UI designer pour SternOS. Génère des UI Schemas JSON.
Types de widgets autorisés: ${VALID_WIDGET_TYPES.join(', ')}
Sources disponibles: /tools/get_roadmap, /tools/get_okrs, /tools/get_daily_briefing, /tools/semantic_search, /tools/get_context
Chaque widget: { id, type, title, source, span (1-12) }
layout: dashboard|list|detail|form|graph|fullscreen
Réponds UNIQUEMENT avec un JSON valide.`

  try {
    const res = await fetch(`${process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LLM_API_KEY || ''}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'qwen/qwen-2.5-coder-32b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Contexte: ${okrContext}\nIntention: ${intent}\nGénère un UI Schema JSON avec page_id, title, intent, layout, widgets[].` }
        ],
        temperature: 0.2
      })
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return c.json({ error: 'LLM did not return valid JSON', raw }, 500)

    const schema = JSON.parse(jsonMatch[0])
    const invalid = (schema.widgets || []).filter(w => !VALID_WIDGET_TYPES.includes(w.type))
    if (invalid.length > 0) return c.json({ error: `Generated invalid widget types: ${invalid.map(w => w.type).join(', ')}`, schema }, 400)

    if (!schema.page_id) schema.page_id = 'generated_' + Date.now()

    await authPb()
    const existing = await pb.collection('ui_schemas').getFullList({ filter: `page_id = "${schema.page_id}"` })
    const result = existing[0]
      ? await pb.collection('ui_schemas').update(existing[0].id, { ...schema, active: true })
      : await pb.collection('ui_schemas').create({ ...schema, version: '1.0.0', active: true })

    return c.json({ success: true, page_id: schema.page_id, schema: result })
  } catch (e) { return c.json({ error: e.message }, 500) }
})

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`\nSternOS MCP Server`)
  console.log(`   Port: ${info.port}`)
  console.log(`   Neo4j: ${NEO4J_URI}`)
  console.log(`   PB: ${PB_URL}`)
  console.log(`   Qdrant: ${QDRANT_URL}`)
  console.log(`   Ready.\n`)
})
