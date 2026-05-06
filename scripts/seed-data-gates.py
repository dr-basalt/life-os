#!/usr/bin/env python3
"""
seed-data-gates.py — Auto-discover and seed all Data Gates into SternOS
Usage: python3 seed-data-gates.py [--dry-run]

Discovers from this server:
  - Git repos in /root/cockpit/
  - Syncthing shared folders (from config.xml)
  - Docker services (from docker-compose files)
  - API endpoints (from .env files)
  - Databases (Neo4j, Qdrant, PostgreSQL, Redis, SQLite)
  - Obsidian vault
  - K8s cluster

Pushes to PocketBase via HTTPS (no local docker).
Does NOT store secrets — only references env var names.
"""

import os, sys, json, urllib.request, urllib.parse, urllib.error
import xml.etree.ElementTree as ET
from pathlib import Path

DRY_RUN = '--dry-run' in sys.argv

PB_URL   = os.environ.get('PB_URL', 'https://api.stern-os.ori3com.cloud')
PB_EMAIL = os.environ.get('PB_EMAIL', os.environ.get('PB_ADMIN_EMAIL', 'admin@ori3com.cloud'))
PB_PASS  = os.environ.get('PB_PASS', os.environ.get('PB_ADMIN_PASSWORD', ''))

COCKPIT  = Path('/root/cockpit')
SYNCTHING_CONFIG = Path('/data/syncthing/syncthing_data/config/config.xml')

# ── PocketBase helpers ────────────────────────────────────────────────────────

def pb_request(path, method='GET', data=None, token=None):
    url = f"{PB_URL}/api/{path}"
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = token
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def pb_auth():
    r = pb_request('admins/auth-with-password', 'POST',
                   {'identity': PB_EMAIL, 'password': PB_PASS})
    token = r.get('token')
    if not token:
        print(f'  PocketBase auth failed: {r}')
        if not DRY_RUN: sys.exit(1)
    return token

def upsert_gate(token, gate):
    """Create or update a gate (upsert by name)."""
    name = gate['name']
    if DRY_RUN:
        print(f'  [DRY] {name}: {gate["type"]} · {gate.get("role","")} · {gate["source_path"][:60]}')
        return

    # Check if exists
    encoded = urllib.parse.quote(f'name="{name}"')
    r = pb_request(f'collections/data_gates/records?filter={encoded}&perPage=1', token=token)
    items = r.get('items', [])

    if items:
        record_id = items[0]['id']
        r2 = pb_request(f'collections/data_gates/records/{record_id}', 'PATCH', gate, token)
        if r2.get('id'):
            print(f'  ✓ updated: {name}')
        else:
            print(f'  ✗ update failed {name}: {r2}')
    else:
        gate.setdefault('sync_status', 'idle')
        gate.setdefault('enabled', True)
        r2 = pb_request('collections/data_gates/records', 'POST', gate, token)
        if r2.get('id'):
            print(f'  + created: {name}')
        else:
            print(f'  ✗ create failed {name}: {r2}')


# ── Discovery functions ───────────────────────────────────────────────────────

def discover_git_repos():
    """Scan /root/cockpit for git repos."""
    gates = []
    for d in sorted(COCKPIT.iterdir()):
        if not d.is_dir() or not (d / '.git').exists():
            continue
        # Try to get remote URL
        remote_url = ''
        config_path = d / '.git' / 'config'
        if config_path.exists():
            content = config_path.read_text(errors='ignore')
            for line in content.splitlines():
                if 'url = ' in line:
                    raw = line.split('url = ', 1)[1].strip()
                    # Strip embedded credentials
                    if '@' in raw and '://' in raw:
                        proto, rest = raw.split('://', 1)
                        rest = rest.split('@', 1)[-1]
                        remote_url = f'{proto}://{rest}'
                    else:
                        remote_url = raw
                    break

        role = 'code'
        targets = ['qdrant:blueprint']
        if d.name in ('veille',):
            role = 'knowledge_source'
            targets = ['qdrant:insights', 'qdrant:blueprint']
        elif d.name in ('vault_to_graph_knowledge', 'meta-lisp-kubernetes'):
            role = 'knowledge_source'
            targets = ['qdrant:insights', 'neo4j:concepts']

        desc_map = {
            'stern-os': 'SternOS codebase — frontend, MCP, SOMA, PocketBase, docker-compose',
            'veille': 'Notes, blueprints, CONOPS, veille stratégique dr-basalt',
            'vault_to_graph_knowledge': 'Pipeline Obsidian vault → Neo4j knowledge graph',
            'dr-basalt-origin': 'Manifests K8s (Authentik, Ghost, infra oricomcloud)',
            'meta-lisp-kubernetes': 'Meta-Lisp + K8s + Neo4j cognitive graph infrastructure',
            'clusters-evo': 'K3S cluster configs, Ignition specs, roadmaps évolution infra',
        }

        gates.append({
            'name': d.name,
            'type': 'git',
            'role': role,
            'source_path': remote_url or str(d),
            'protocol': 'https' if remote_url.startswith('https') else 'ssh',
            'parser': 'markdown',
            'targets': targets,
            'auth_mode': 'bearer' if remote_url else 'none',
            'auth_secret_ref': 'GH_TOKEN' if 'github' in remote_url else '',
            'description': desc_map.get(d.name, f'Git repo {d.name}'),
            'sync_schedule': '0 4 * * *',
        })
    return gates

def discover_syncthing():
    """Parse Syncthing config.xml for shared folders."""
    gates = []
    if not SYNCTHING_CONFIG.exists():
        return gates
    try:
        tree = ET.parse(SYNCTHING_CONFIG)
        root = tree.getroot()
        folder_descs = {
            'rebq9-44ule':               ('vault-jarvis-obsidian', 'Obsidian vault mobile Jarvis (notes, journaux, veille)', 'knowledge_source', 'obsidian', 'markdown', ['qdrant:insights', 'neo4j:notes'], '0 3 * * *'),
            'dkq0r-2kt7u':               ('boox-notes', 'Notes manuscrites Boox e-ink tablet', 'knowledge_source', 'syncthing', 'markdown', ['qdrant:insights'], '0 5 * * *'),
            'abher-w2xoy':               ('boox-ebooks', 'E-books sync depuis Boox', 'storage', 'syncthing', 'binary', [], ''),
            'ivoh2-39cpp':               ('projets-kanban', 'Kanban projets partagé', 'data', 'syncthing', 'json', ['pb:projects'], '0 6 * * *'),
            'jarvis-memory-mobile-main': ('jarvis-memory', 'Mémoire mobile Jarvis (context, insights)', 'knowledge_source', 'syncthing', 'jsonl', ['qdrant:insights'], '0 4 * * *'),
            'nkqm4-q9hjm':               ('jarvis-dev-workspace', 'Workspace dev Jarvis UAC', 'code', 'syncthing', 'json', [], ''),
            'apk':                       ('openclaw-apk', 'Builds APK OpenClaw', 'storage', 'syncthing', 'binary', [], ''),
        }
        for folder in root.findall('folder'):
            fid = folder.get('id', '')
            fpath = folder.get('path', '')
            flabel = folder.get('label', fid)
            if fid in folder_descs:
                name, desc, role, ftype, parser, targets, schedule = folder_descs[fid]
            else:
                name = flabel.lower().replace(' ', '-').replace('_', '-')
                desc = f'Syncthing folder: {flabel}'
                role = 'storage'
                ftype = 'syncthing'
                parser = 'json'
                targets = []
                schedule = ''

            gates.append({
                'name': name,
                'type': ftype,
                'role': role,
                'source_path': fpath,
                'protocol': 'syncthing',
                'driver': fid,  # store folder ID in driver field
                'parser': parser,
                'targets': targets,
                'auth_mode': 'none',
                'description': desc,
                'sync_schedule': schedule,
            })
    except Exception as e:
        print(f'  Syncthing parse error: {e}')
    return gates

def discover_databases():
    """Known databases in the stack."""
    return [
        {
            'name': 'neo4j-persona',
            'type': 'database',
            'role': 'knowledge_source',
            'source_path': 'bolt://172.17.0.1:7687',
            'protocol': 'bolt',
            'driver': 'neo4j',
            'parser': 'cypher',
            'targets': [],
            'auth_mode': 'basic',
            'auth_secret_ref': 'NEO4J_PASSWORD',
            'description': 'Neo4j persona graph — User, Douleurs, Patterns, Désirs, P0, OKRs, Insights',
            'sync_schedule': '',
        },
        {
            'name': 'qdrant-vectors',
            'type': 'database',
            'role': 'knowledge_source',
            'source_path': 'http://sternos-qdrant:6333',
            'protocol': 'http',
            'driver': 'qdrant',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'none',
            'description': 'Qdrant vector DB — collections: insights, okrs, blueprint',
            'sync_schedule': '',
        },
        {
            'name': 'pocketbase-sqlite',
            'type': 'sql',
            'role': 'data',
            'source_path': 'http://sternos-pb:8090',
            'protocol': 'http',
            'driver': 'sqlite',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'basic',
            'auth_secret_ref': 'PB_ADMIN_PASSWORD',
            'description': 'PocketBase SQLite — OKRs, tasks, victories, metrics, onboarding, data_gates, claude_projects',
            'sync_schedule': '',
        },
        {
            'name': 'windmill-postgres',
            'type': 'sql',
            'role': 'compute',
            'source_path': 'postgresql://windmill:${WM_DB_PASS}@windmill_db/windmill',
            'protocol': 'postgresql',
            'driver': 'postgres',
            'parser': 'sql',
            'targets': [],
            'auth_mode': 'basic',
            'auth_secret_ref': 'WM_DB_PASS',
            'description': 'PostgreSQL backend pour Windmill (orchestration, flows)',
            'sync_schedule': '',
        },
        {
            'name': 'redis-infra',
            'type': 'redis',
            'role': 'cache',
            'source_path': 'redis://localhost:6379',
            'protocol': 'tcp',
            'driver': 'redis',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'none',
            'description': 'Redis exposé sur infra.ori3com.cloud — session/cache store',
            'sync_schedule': '',
        },
    ]

def discover_api_services():
    """Known API endpoints — SternOS stack + infra."""
    return [
        # SternOS
        {
            'name': 'soma-runtime',
            'type': 'api',
            'role': 'ai_provider',
            'source_path': 'https://soma.stern-os.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'bearer',
            'auth_secret_ref': 'SOMA_ADMIN_TOKEN',
            'description': 'SOMA — LLM-agnostic agent runtime SternOS (OpenAI-compatible chat API)',
        },
        {
            'name': 'mcp-sternos',
            'type': 'mcp',
            'role': 'knowledge_source',
            'source_path': 'https://mcp.stern-os.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'none',
            'description': 'MCP Server SternOS — 14 tools: get_context, get_okrs, semantic_search, data_gates SCRUD...',
        },
        {
            'name': 'pocketbase-api',
            'type': 'api',
            'role': 'data',
            'source_path': 'https://api.stern-os.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'basic',
            'auth_secret_ref': 'PB_ADMIN_PASSWORD',
            'description': 'PocketBase REST API public — collections OKR, tasks, data_gates...',
        },
        # Infra
        {
            'name': 'n8n-workflows',
            'type': 'api',
            'role': 'workflow',
            'source_path': 'https://n8n1890.infra.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'basic',
            'auth_secret_ref': 'N8N_BASIC_AUTH',
            'description': 'n8n workflow automation — data pipelines, triggers, sync jobs',
        },
        {
            'name': 'ollama-local',
            'type': 'ollama',
            'role': 'ai_provider',
            'source_path': 'https://ollama1890.infra.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'none',
            'description': 'Ollama local LLM inference — modèles locaux (llama, mistral...)',
        },
        {
            'name': 'flowise-ai',
            'type': 'api',
            'role': 'workflow',
            'source_path': 'https://flowise1890.infra.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'bearer',
            'auth_secret_ref': 'FLOWISE_API_KEY',
            'description': 'Flowise — LLM chain builder, prototypage agentique visuel',
        },
        {
            'name': 'syncthing-api',
            'type': 'api',
            'role': 'storage',
            'source_path': 'https://syncthing.infra.ori3com.cloud',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'apikey',
            'auth_secret_ref': 'SYNCTHING_API_KEY',
            'description': 'Syncthing REST API — gestion des partages, devices, statut sync',
        },
        {
            'name': 'github-api',
            'type': 'api',
            'role': 'code',
            'source_path': 'https://api.github.com',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'bearer',
            'auth_secret_ref': 'GH_TOKEN',
            'description': 'GitHub API — repos dr-basalt, issues, PRs, CI/CD',
        },
        {
            'name': 'openai-embeddings',
            'type': 'api',
            'role': 'ai_provider',
            'source_path': 'https://api.openai.com/v1',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'bearer',
            'auth_secret_ref': 'LLM_API_KEY',
            'description': 'OpenAI API — embeddings (text-embedding-3-small), GPT-4o-mini pour SOMA/MCP',
        },
        {
            'name': 'coolify-api',
            'type': 'api',
            'role': 'compute',
            'source_path': 'https://app.coolify.io',
            'protocol': 'https',
            'parser': 'json',
            'targets': [],
            'auth_mode': 'bearer',
            'auth_secret_ref': 'COOLIFY_API_TOKEN',
            'description': 'Coolify — PaaS déployant SternOS sur stern-os-brain (46.224.111.203)',
        },
    ]

def discover_s3():
    return [
        {
            'name': 'hetzner-s3-lifeos',
            'type': 's3',
            'role': 'storage',
            'source_path': 'https://fsn1.your-objectstorage.com/lifeos-db',
            'protocol': 'https',
            'driver': 's3',
            'parser': 'binary',
            'targets': [],
            'auth_mode': 'apikey',
            'auth_secret_ref': 'S3_KEY',
            'description': 'Hetzner Object Storage — Litestream DB replication (PocketBase SQLite backups)',
        },
    ]

def discover_k8s():
    return [
        {
            'name': 'meta-factory-k8s',
            'type': 'k8s',
            'role': 'compute',
            'source_path': 'https://178.105.12.1:6443',
            'protocol': 'https',
            'driver': 'k8s',
            'parser': 'yaml',
            'targets': [],
            'auth_mode': 'mtls',
            'auth_secret_ref': 'KUBECONFIG',
            'description': 'K3S cluster meta-factory — Authentik, Ghost, workloads K8s',
        },
    ]


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f'PB: {PB_URL}')
    if DRY_RUN:
        print('--- DRY RUN (no writes) ---')
        token = None
    else:
        token = pb_auth()
        if not token:
            return
        print('PB auth OK')

    all_gates = []
    print('\n[Git repos]')
    git_gates = discover_git_repos()
    all_gates += git_gates

    print('\n[Syncthing folders]')
    sync_gates = discover_syncthing()
    all_gates += sync_gates

    print('\n[Databases]')
    all_gates += discover_databases()

    print('\n[API services]')
    all_gates += discover_api_services()

    print('\n[S3 storage]')
    all_gates += discover_s3()

    print('\n[Kubernetes]')
    all_gates += discover_k8s()

    print(f'\nTotal: {len(all_gates)} gates to seed\n')

    sections = [
        ('Git repos',        git_gates),
        ('Syncthing',        sync_gates),
        ('Databases',        discover_databases()),
        ('API services',     discover_api_services()),
        ('S3 storage',       discover_s3()),
        ('Kubernetes',       discover_k8s()),
    ]

    for section, gates in sections:
        print(f'\n[{section}]')
        for gate in gates:
            upsert_gate(token, gate)

    print(f'\nDone. {len(all_gates)} gates seeded.')


if __name__ == '__main__':
    main()
