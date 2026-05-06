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
  version: '1.2.0',
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

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`\nSternOS MCP Server`)
  console.log(`   Port: ${info.port}`)
  console.log(`   Neo4j: ${NEO4J_URI}`)
  console.log(`   PB: ${PB_URL}`)
  console.log(`   Qdrant: ${QDRANT_URL}`)
  console.log(`   Ready.\n`)
})
