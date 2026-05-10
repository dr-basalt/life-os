#!/usr/bin/env node
/**
 * seed-gates.js — Seed Data Gates registry in PocketBase
 * Run via: docker exec sternos-mcp node /opt/stern-os/scripts/seed-gates.js
 * Or:      make seed-gates (on stern-os-brain)
 *
 * Uses internal PocketBase URL (no SSL issues, no public exposure).
 * All secrets stored as secret_ref (env var name), never the secret itself.
 */

const PB    = process.env.PB_URL    || 'http://sternos-pb:8090'
const EMAIL = process.env.PB_ADMIN_EMAIL    || 'admin@ori3com.cloud'
const PASS  = process.env.PB_ADMIN_PASSWORD || 'SternOS2026!'

const GATES = [
  // ── Git repos ──────────────────────────────────────────────────────────────
  { name: 'stern-os',            type: 'git',      role: 'code',             source_path: 'https://github.com/dr-basalt/stern-os.git',                   parser: 'markdown', targets: ['qdrant:blueprint'],              auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',        description: 'SternOS codebase — frontend, MCP, SOMA, PocketBase, docker-compose' },
  { name: 'veille',              type: 'git',      role: 'knowledge_source', source_path: 'https://github.com/dr-basalt/o3c-veille.git',                 parser: 'markdown', targets: ['qdrant:insights','qdrant:blueprint'], auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',  description: 'Notes, blueprints, CONOPS, veille stratégique dr-basalt', sync_schedule: '0 4 * * *' },
  { name: 'vault-to-graph',      type: 'git',      role: 'knowledge_source', source_path: 'https://github.com/dr-basalt/o3c-vault-knowledge-graph.git',  parser: 'markdown', targets: ['qdrant:insights'],               auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',        description: 'Pipeline Obsidian vault → Neo4j knowledge graph' },
  { name: 'meta-lisp-kubernetes',type: 'git',      role: 'knowledge_source', source_path: 'https://github.com/dr-basalt/meta-lisp-kubernetes.git',       parser: 'markdown', targets: ['qdrant:blueprint'],              auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',        description: 'Meta-Lisp + K8s + Neo4j cognitive graph infrastructure' },
  { name: 'dr-basalt-origin',    type: 'git',      role: 'code',             source_path: 'https://github.com/dr-basalt/dr-basalt-origin.git',           parser: 'yaml',     targets: [],                               auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',        description: 'K8s manifests — Authentik, Ghost, infra ori3com' },
  { name: 'clusters-evo',        type: 'git',      role: 'code',             source_path: 'https://github.com/dr-basalt/clusters-evo.git',               parser: 'yaml',     targets: [],                               auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',        description: 'K3S cluster configs, Ignition specs, roadmaps infra' },
  // ── Syncthing / Obsidian ───────────────────────────────────────────────────
  { name: 'vault-jarvis-obsidian',type: 'obsidian', role: 'knowledge_source', source_path: '/data/jarvis-mobile-obsidian', protocol: 'syncthing', driver: 'rebq9-44ule', parser: 'markdown', targets: ['qdrant:insights','neo4j:notes'], auth_mode: 'none', description: 'Obsidian vault mobile Jarvis (notes, journaux, veille)', sync_schedule: '0 3 * * *' },
  { name: 'boox-notes',           type: 'syncthing', role: 'knowledge_source', source_path: '/data/boox-notes',           driver: 'dkq0r-2kt7u',   parser: 'markdown', targets: ['qdrant:insights'], auth_mode: 'none', description: 'Notes manuscrites Boox e-ink tablet',           sync_schedule: '0 5 * * *' },
  { name: 'projets-kanban',       type: 'syncthing', role: 'data',             source_path: '/data/projets_kanban',        driver: 'ivoh2-39cpp',   parser: 'json',     targets: [],                  auth_mode: 'none', description: 'Kanban projets partagé' },
  { name: 'jarvis-memory',        type: 'syncthing', role: 'knowledge_source', source_path: '/data/jarvis-memory-mobile',  driver: 'jarvis-memory-mobile-main', parser: 'jsonl', targets: ['qdrant:insights'], auth_mode: 'none', description: 'Mémoire mobile Jarvis (context, insights)', sync_schedule: '0 4 * * *' },
  // ── Databases ─────────────────────────────────────────────────────────────
  { name: 'neo4j-persona',     type: 'database', role: 'knowledge_source', source_path: 'bolt://172.17.0.1:7687',              protocol: 'bolt',       driver: 'neo4j',   parser: 'cypher', targets: [], auth_mode: 'basic',  auth_secret_ref: 'NEO4J_PASSWORD',    description: 'Neo4j persona graph — User, Douleurs, Patterns, Désirs, P0, OKRs, Insights' },
  { name: 'qdrant-vectors',    type: 'database', role: 'knowledge_source', source_path: 'http://sternos-qdrant:6333',          protocol: 'http',       driver: 'qdrant',  parser: 'json',   targets: [], auth_mode: 'none',                                        description: 'Qdrant vector DB — collections: insights, okrs, blueprint' },
  { name: 'pocketbase-sqlite', type: 'sql',      role: 'data',             source_path: 'http://sternos-pb:8090',              protocol: 'http',       driver: 'sqlite',  parser: 'json',   targets: [], auth_mode: 'basic',  auth_secret_ref: 'PB_ADMIN_PASSWORD', description: 'PocketBase SQLite — OKRs, tasks, victories, data_gates, onboarding' },
  { name: 'windmill-postgres', type: 'sql',      role: 'compute',          source_path: 'postgresql://windmill@windmill_db/windmill', protocol: 'postgresql', driver: 'postgres', parser: 'sql', targets: [], auth_mode: 'basic', auth_secret_ref: 'WM_DB_PASS', description: 'PostgreSQL backend Windmill (orchestration, flows)' },
  { name: 'redis-infra',       type: 'redis',    role: 'cache',            source_path: 'redis://localhost:6379',               protocol: 'tcp',        driver: 'redis',   parser: 'json',   targets: [], auth_mode: 'none',                                        description: 'Redis infra.ori3com.cloud — session/cache store' },
  // ── APIs ──────────────────────────────────────────────────────────────────
  { name: 'soma-runtime',     type: 'api',    role: 'ai_provider',     source_path: 'https://soma.stern-os.ori3com.cloud',          parser: 'json', targets: [], auth_mode: 'bearer', auth_secret_ref: 'SOMA_ADMIN_TOKEN',  description: 'SOMA — LLM-agnostic agent runtime SternOS (OpenAI-compatible)' },
  { name: 'mcp-sternos',      type: 'mcp',    role: 'knowledge_source', source_path: 'https://mcp.stern-os.ori3com.cloud',          parser: 'json', targets: [], auth_mode: 'none',                                        description: 'MCP Server SternOS v1.2.0 — 14 tools: persona, OKRs, semantic_search, data_gates SCRUD' },
  { name: 'pocketbase-api',   type: 'api',    role: 'data',             source_path: 'https://api.stern-os.ori3com.cloud',          parser: 'json', targets: [], auth_mode: 'basic',  auth_secret_ref: 'PB_ADMIN_PASSWORD', description: 'PocketBase REST API public — collections OKR, tasks, data_gates...' },
  { name: 'n8n-workflows',    type: 'api',    role: 'workflow',         source_path: 'https://n8n1890.infra.ori3com.cloud',         parser: 'json', targets: [], auth_mode: 'basic',  auth_secret_ref: 'N8N_BASIC_AUTH',    description: 'n8n workflow automation — pipelines, triggers, sync jobs' },
  { name: 'ollama-local',     type: 'ollama', role: 'ai_provider',     source_path: 'https://ollama1890.infra.ori3com.cloud',       parser: 'json', targets: [], auth_mode: 'none',                                        description: 'Ollama local LLM inference — modèles locaux (llama, mistral...)' },
  { name: 'flowise-ai',       type: 'api',    role: 'workflow',         source_path: 'https://flowise1890.infra.ori3com.cloud',      parser: 'json', targets: [], auth_mode: 'bearer', auth_secret_ref: 'FLOWISE_API_KEY',   description: 'Flowise — LLM chain builder, prototypage agentique visuel' },
  { name: 'syncthing-api',    type: 'api',    role: 'storage',          source_path: 'https://syncthing.infra.ori3com.cloud',        parser: 'json', targets: [], auth_mode: 'apikey', auth_secret_ref: 'SYNCTHING_API_KEY', description: 'Syncthing REST API — gestion partages, devices, statut sync' },
  { name: 'github-api',       type: 'api',    role: 'code',             source_path: 'https://api.github.com',                       parser: 'json', targets: [], auth_mode: 'bearer', auth_secret_ref: 'GH_TOKEN',          description: 'GitHub API — repos dr-basalt, issues, PRs, CI/CD' },
  { name: 'openai-embeddings', type: 'api',   role: 'ai_provider',     source_path: 'https://api.openai.com/v1',                    parser: 'json', targets: [], auth_mode: 'bearer', auth_secret_ref: 'LLM_API_KEY',       description: 'OpenAI API — text-embedding-3-small + GPT-4o-mini' },
  { name: 'coolify-api',      type: 'api',    role: 'compute',          source_path: 'http://128.140.115.220:8000',                  parser: 'json', targets: [], auth_mode: 'bearer', auth_secret_ref: 'COOLIFY_API_TOKEN', description: 'Coolify self-hosted ori3com (128.140.115.220:8000) — PaaS déployant SternOS sur stern-os-brain 46.224.111.203' },
  // ── Storage ───────────────────────────────────────────────────────────────
  { name: 'hetzner-s3-lifeos', type: 's3',  role: 'storage', source_path: 'https://fsn1.your-objectstorage.com/lifeos-db', driver: 's3', parser: 'binary', targets: [], auth_mode: 'apikey', auth_secret_ref: 'S3_KEY', description: 'Hetzner Object Storage — Litestream DB replication (PocketBase backups)' },
  // ── K8s ───────────────────────────────────────────────────────────────────
  { name: 'meta-factory-k8s', type: 'k8s', role: 'compute', source_path: 'https://178.105.12.1:6443', driver: 'k8s', parser: 'yaml', targets: [], auth_mode: 'mtls', auth_secret_ref: 'KUBECONFIG', description: 'K3S cluster meta-factory — Authentik, Ghost, workloads K8s' },
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
  console.log(`Auth OK — seeding ${GATES.length} gates...\n`)

  let created = 0, updated = 0, errors = 0

  for (const gate of GATES) {
    try {
      const enc = encodeURIComponent(`name="${gate.name}"`)
      const list = await (await fetch(`${PB}/api/collections/data_gates/records?filter=${enc}&perPage=1`, {
        headers: { Authorization: token }
      })).json()
      const existing = list.items?.[0]

      if (existing) {
        const r = await (await fetch(`${PB}/api/collections/data_gates/records/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify(gate)
        })).json()
        if (r.id) { process.stdout.write('~'); updated++ }
        else { process.stdout.write('E'); errors++; console.error(`\nPATCH ERR ${gate.name}:`, JSON.stringify(r).slice(0, 120)) }
      } else {
        const r = await (await fetch(`${PB}/api/collections/data_gates/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({ ...gate, sync_status: 'idle', enabled: true })
        })).json()
        if (r.id) { process.stdout.write('+'); created++ }
        else { process.stdout.write('E'); errors++; console.error(`\nPOST ERR ${gate.name}:`, JSON.stringify(r).slice(0, 120)) }
      }
    } catch (e) {
      process.stdout.write('!')
      errors++
      console.error(`\nERR ${gate.name}:`, e.message)
    }
  }

  console.log(`\n\nDone: +${created} created, ~${updated} updated, ${errors} errors`)
}

main()
