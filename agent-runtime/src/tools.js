import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { readdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { execSync } from 'child_process'
import neo4j from 'neo4j-driver'
import PocketBase from 'pocketbase'

const BASE_PATH = process.env.PROJECT_PATH || '/opt/stern-os'
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://172.17.0.1:7687'
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'SternOS2026xNeo4j'
const PB_URL = process.env.PB_URL || 'http://sternos-pb:8090'
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@ori3com.cloud'
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'SternOS2026!'
const QDRANT_URL = process.env.QDRANT_URL || 'http://sternos-qdrant:6333'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || ''

let neoDriver
try {
  neoDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD))
} catch {}

const pb = new PocketBase(PB_URL)

// ── Security guard ─────────────────────────────────────────────────────────
function guardPath(p) {
  const abs = resolve(BASE_PATH, p.replace(/^\/opt\/stern-os\/?/, ''))
  if (!abs.startsWith(BASE_PATH) && !abs.startsWith('/tmp/stern-os')) {
    throw new Error(`Path not allowed: ${p}. Must be within ${BASE_PATH}`)
  }
  return abs
}

const ALLOWED_CMD_PREFIXES = [
  'git ', 'docker compose ', 'docker logs ', 'docker exec sternos-',
  'docker exec neo4j-', 'docker ps', 'npm run ', 'node ', 'ls ', 'cat ',
  'grep ', 'find /opt/stern-os', 'curl -s http://localhost', 'cypher-shell'
]

function guardCommand(cmd) {
  const allowed = ALLOWED_CMD_PREFIXES.some(prefix => cmd.trim().startsWith(prefix))
  if (!allowed) throw new Error(`Command not allowed: ${cmd}`)
}

// ── Tool implementations ────────────────────────────────────────────────────

export function read_file({ path: p }) {
  const abs = guardPath(p)
  if (!existsSync(abs)) return { error: `File not found: ${p}` }
  const content = readFileSync(abs, 'utf-8')
  return { path: abs, content, lines: content.split('\n').length }
}

export function write_file({ path: p, content }) {
  const abs = guardPath(p)
  // Auto-backup
  if (existsSync(abs)) {
    const backupDir = '/tmp/stern-os-workspace/backups'
    mkdirSync(backupDir, { recursive: true })
    const backup = join(backupDir, `${Date.now()}_${abs.split('/').pop()}`)
    writeFileSync(backup, readFileSync(abs))
  }
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
  return { success: true, path: abs, bytes: content.length }
}

export function list_dir({ path: p = '.' }) {
  const abs = guardPath(p)
  if (!existsSync(abs)) return { error: `Directory not found: ${p}` }
  const entries = readdirSync(abs).map(name => {
    const full = join(abs, name)
    const stat = statSync(full)
    return { name, type: stat.isDirectory() ? 'dir' : 'file', size: stat.size }
  })
  return { path: abs, entries }
}

export function run_command({ command, cwd = BASE_PATH }) {
  guardCommand(command)
  const workdir = resolve(cwd.startsWith('/') ? cwd : join(BASE_PATH, cwd))
  try {
    const output = execSync(command, {
      cwd: workdir,
      timeout: 30000,
      encoding: 'utf-8',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' }
    })
    return { success: true, output: output.trim() }
  } catch (e) {
    return { success: false, error: e.message, stdout: e.stdout?.toString(), stderr: e.stderr?.toString() }
  }
}

export function git_commit({ message, files = ['.'] }) {
  try {
    const addCmd = `git add ${files.join(' ')}`
    execSync(addCmd, { cwd: BASE_PATH })
    const commitMsg = `${message}\n\nCo-Authored-By: SOMA <soma@sternos.local>`
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: BASE_PATH })
    return { success: true, message: 'Committed' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function neo4j_query({ cypher, params = {} }) {
  if (!neoDriver) return { error: 'Neo4j not connected' }
  const session = neoDriver.session()
  try {
    const result = await session.run(cypher, params)
    return {
      records: result.records.map(r =>
        Object.fromEntries(r.keys.map(k => [k, r.get(k)?.properties || r.get(k)]))
      )
    }
  } catch (e) {
    return { error: e.message }
  } finally {
    await session.close()
  }
}

export async function pb_api({ method = 'GET', collection, id, data }) {
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
    let result
    if (method === 'GET') {
      result = id
        ? await pb.collection(collection).getOne(id)
        : await pb.collection(collection).getFullList()
    } else if (method === 'POST') {
      result = await pb.collection(collection).create(data)
    } else if (method === 'PATCH') {
      result = await pb.collection(collection).update(id, data)
    } else if (method === 'DELETE') {
      await pb.collection(collection).delete(id)
      result = { deleted: true }
    }
    return result
  } catch (e) {
    return { error: e.message }
  }
}

export function docker_status() {
  try {
    const output = execSync('docker ps --format "{{.Names}}\\t{{.Status}}\\t{{.Ports}}"', {
      encoding: 'utf-8'
    })
    const containers = output.trim().split('\n').map(line => {
      const [name, status, ports] = line.split('\t')
      return { name, status, ports }
    })
    return { containers }
  } catch (e) {
    return { error: e.message }
  }
}

// ── Qdrant helpers ─────────────────────────────────────────────────────────

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

export async function qdrant_search({ collection = 'insights', query_text, top_k = 5 }) {
  try {
    const vector = await embedText(query_text)
    const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, limit: top_k, with_payload: true })
    })
    const data = await res.json()
    return { results: data.result || [] }
  } catch (e) {
    return { error: e.message }
  }
}

export async function embed_and_upsert({ collection = 'insights', id, text, metadata = {} }) {
  try {
    const vector = await embedText(text)
    const pointId = id || crypto.randomUUID()
    const res = await fetch(`${QDRANT_URL}/collections/${collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{ id: pointId, vector, payload: { text, ...metadata, indexed_at: new Date().toISOString() } }]
      })
    })
    const data = await res.json()
    return { success: true, id: pointId, status: data.status }
  } catch (e) {
    return { error: e.message }
  }
}

export function search_code({ query, file_pattern = '**/*.{js,ts,svelte,yaml,json}' }) {
  try {
    const output = execSync(
      `grep -r "${query.replace(/"/g, '\\"')}" ${BASE_PATH} --include="*.js" --include="*.ts" --include="*.svelte" --include="*.yaml" -l 2>/dev/null | head -10`,
      { encoding: 'utf-8' }
    )
    return { files: output.trim().split('\n').filter(Boolean) }
  } catch {
    return { files: [] }
  }
}

// ── Tool registry (for LLM function calling) ──────────────────────────────
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lire le contenu d\'un fichier du codebase SternOS',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Chemin relatif ou absolu dans /opt/stern-os' } },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Créer ou modifier un fichier (backup auto avant modification)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string', description: 'Contenu complet du fichier' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'Lister les fichiers d\'un répertoire',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Exécuter une commande (git, docker, npm)',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Répertoire de travail (défaut: /opt/stern-os)' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Commiter les changements courants',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'neo4j_query',
      description: 'Exécuter une requête Cypher sur le Persona Graph',
      parameters: {
        type: 'object',
        properties: {
          cypher: { type: 'string' },
          params: { type: 'object' }
        },
        required: ['cypher']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'pb_api',
      description: 'CRUD sur les collections PocketBase',
      parameters: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'PATCH', 'DELETE'] },
          collection: { type: 'string' },
          id: { type: 'string' },
          data: { type: 'object' }
        },
        required: ['collection']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_status',
      description: 'Vérifier l\'état des containers Docker SternOS',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Rechercher du code dans le codebase',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          file_pattern: { type: 'string' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'qdrant_search',
      description: 'Recherche sémantique dans les collections Qdrant (insights, okrs, blueprint)',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Nom de la collection Qdrant (défaut: insights)' },
          query_text: { type: 'string', description: 'Texte à rechercher sémantiquement' },
          top_k: { type: 'number', description: 'Nombre de résultats (défaut: 5)' }
        },
        required: ['query_text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'embed_and_upsert',
      description: 'Indexer un document dans Qdrant (embedding OpenAI text-embedding-3-small)',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'Collection cible (défaut: insights)' },
          id: { type: 'string', description: 'ID unique du point (UUID généré si absent)' },
          text: { type: 'string', description: 'Texte à embedder et indexer' },
          metadata: { type: 'object', description: 'Métadonnées additionnelles (source, tags, etc.)' }
        },
        required: ['text']
      }
    }
  }
]

export const TOOL_MAP = {
  read_file, write_file, list_dir, run_command, git_commit,
  neo4j_query, pb_api, docker_status, search_code,
  qdrant_search, embed_and_upsert
}
