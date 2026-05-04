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

// ── MCP Manifest ────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({
  name: 'SternOS MCP',
  version: '1.0.0',
  description: 'SternOS — Cognitive OS for dr-basalt. Persona graph, OKRs, tasks, roadmap.',
  server: 'stern-os-brain 46.224.111.203',
  endpoints: {
    manifest: 'GET /',
    health: 'GET /health',
    tools: {
      get_context: 'POST /tools/get_context',
      get_okrs: 'POST /tools/get_okrs',
      create_task: 'POST /tools/create_task',
      update_kr_progress: 'POST /tools/update_kr_progress',
      get_roadmap: 'POST /tools/get_roadmap',
      add_insight: 'POST /tools/add_insight',
    }
  },
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

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`\n🤖 SternOS MCP Server`)
  console.log(`   Port: ${info.port}`)
  console.log(`   Neo4j: ${NEO4J_URI}`)
  console.log(`   PB: ${PB_URL}`)
  console.log(`   Ready.\n`)
})
