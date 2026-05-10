#!/usr/bin/env python3
"""
sync-obsidian-gate.py — Sync an Obsidian vault Data Gate to Qdrant + Neo4j
Usage:
  python3 sync-obsidian-gate.py [gate_name]
  python3 sync-obsidian-gate.py  # syncs all enabled obsidian/syncthing gates

Env vars:
  PB_URL, PB_EMAIL (or PB_ADMIN_EMAIL), PB_PASS (or PB_ADMIN_PASSWORD)
  QDRANT_URL
  OPENAI_API_KEY (or LLM_API_KEY)
  NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD  (optional — entity extraction)
"""

import os, json, sys, re, hashlib
from pathlib import Path
import urllib.request, urllib.parse

PB_URL     = os.environ.get('PB_URL', 'http://localhost:8090')
PB_EMAIL   = os.environ.get('PB_EMAIL', os.environ.get('PB_ADMIN_EMAIL', 'admin@ori3com.cloud'))
PB_PASS    = os.environ.get('PB_PASS', os.environ.get('PB_ADMIN_PASSWORD', 'SternOS2026!'))
QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
OPENAI_KEY = os.environ.get('OPENAI_API_KEY', os.environ.get('LLM_API_KEY', ''))
NEO4J_URI  = os.environ.get('NEO4J_URI', '')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASS = os.environ.get('NEO4J_PASSWORD', '')

CHUNK_SIZE = 800  # chars per chunk
WIKILINK_RE = re.compile(r'\[\[([^\]|#]+?)(?:[|#][^\]]*?)?\]\]')
FRONTMATTER_TAG_RE = re.compile(r'^tags:\s*\[([^\]]+)\]', re.MULTILINE)
FRONTMATTER_PRED_RE = re.compile(r'predecesseurs:\s*\n((?:\s*-\s*.+\n?)+)', re.MULTILINE)

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def pb_request(path, method='GET', data=None, token=None):
    url = f"{PB_URL}/api/{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = token
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
        print(f"PB auth failed: {r}")
        sys.exit(1)
    return token


def http_post(url, data, headers=None):
    h = {'Content-Type': 'application/json'}
    if headers:
        h.update(headers)
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=h, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def embed(text):
    r = http_post(
        'https://api.openai.com/v1/embeddings',
        {'model': 'text-embedding-3-small', 'input': text[:8000]},
        {'Authorization': f'Bearer {OPENAI_KEY}'}
    )
    return r['data'][0]['embedding']


def upsert_point(collection, point_id, vector, payload):
    url = f"{QDRANT_URL}/collections/{collection}/points?wait=true"
    http_post(url, {'points': [{'id': point_id, 'vector': vector, 'payload': payload}]})

# ── Neo4j helper ──────────────────────────────────────────────────────────────

neo4j_driver = None

def get_neo4j():
    global neo4j_driver
    if neo4j_driver is not None:
        return neo4j_driver
    if not NEO4J_URI or not NEO4J_PASS:
        return None
    try:
        import neo4j as _neo4j
        neo4j_driver = _neo4j.GraphDatabase.driver(
            NEO4J_URI, auth=(_neo4j.basic_auth(NEO4J_USER, NEO4J_PASS))
        )
        return neo4j_driver
    except ImportError:
        print("  [neo4j] neo4j driver not installed — skipping entity extraction")
        return None
    except Exception as e:
        print(f"  [neo4j] Connection failed: {e} — skipping entity extraction")
        return None


def neo4j_run(cypher, params=None):
    driver = get_neo4j()
    if not driver:
        return None
    try:
        with driver.session() as session:
            result = session.run(cypher, params or {})
            return [dict(r) for r in result]
    except Exception as e:
        print(f"  [neo4j] Query error: {e}")
        return None


def extract_and_push_entities(md_file_path, raw_text, frontmatter_text, source_rel, insight_id):
    """Extract concepts + tags from a note and push to Neo4j."""
    if not get_neo4j():
        return

    is_veille = '/Veille/' in str(md_file_path) or '/veille/' in str(md_file_path)

    # 1. Create Insight node linked to User
    neo4j_run("""
        MERGE (u:User {id: 'dr-basalt'})
        MERGE (ins:Insight {id: $id})
        ON CREATE SET ins.source_path = $source, ins.created_at = datetime()
        ON MATCH SET  ins.source_path = $source
        MERGE (u)-[:HAS_INSIGHT]->(ins)
    """, {'id': insight_id, 'source': source_rel})

    # 2. Extract [[wikilinks]] → Concept nodes
    concepts = WIKILINK_RE.findall(raw_text)
    for concept in set(concepts):
        concept = concept.strip()
        if len(concept) < 2 or len(concept) > 100:
            continue
        neo4j_run("""
            MERGE (c:Concept {name: $name})
            WITH c
            MATCH (ins:Insight {id: $id})
            MERGE (ins)-[:MENTIONS]->(c)
        """, {'name': concept, 'id': insight_id})

    # 3. For Veille notes: extract tags + predecesseurs from frontmatter
    if is_veille and frontmatter_text:
        # Tags
        tag_match = FRONTMATTER_TAG_RE.search(frontmatter_text)
        if tag_match:
            tags = [t.strip().strip('"').strip("'") for t in tag_match.group(1).split(',')]
            for tag in tags:
                if not tag:
                    continue
                neo4j_run("""
                    MERGE (t:Tag {name: $tag})
                    WITH t
                    MATCH (ins:Insight {id: $id})
                    MERGE (ins)-[:HAS_TAG]->(t)
                """, {'tag': tag, 'id': insight_id})

        # Predecesseurs
        pred_match = FRONTMATTER_PRED_RE.search(frontmatter_text)
        if pred_match:
            preds = [p.strip().lstrip('- ') for p in pred_match.group(1).strip().split('\n') if p.strip()]
            for pred_path in preds:
                neo4j_run("""
                    MERGE (p:Note {path: $path})
                    WITH p
                    MATCH (ins:Insight {id: $id})
                    MERGE (ins)-[:PRECEDE]->(p)
                """, {'path': pred_path, 'id': insight_id})

# ── Markdown helpers ──────────────────────────────────────────────────────────

def extract_frontmatter(text):
    """Return (frontmatter_str, body_str)."""
    if text.startswith('---'):
        end = text.find('\n---', 3)
        if end != -1:
            return text[3:end].strip(), text[end + 4:].strip()
    return '', text


def chunk_markdown(text, max_chars=CHUNK_SIZE):
    """Split by headings or by char limit."""
    sections = re.split(r'(?m)^#{1,3} ', text)
    chunks = []
    for s in sections:
        s = s.strip()
        if not s:
            continue
        while len(s) > max_chars:
            chunks.append(s[:max_chars])
            s = s[max_chars:]
        if s:
            chunks.append(s)
    return chunks


def deterministic_id(path, chunk_idx):
    """UUID-like deterministic ID from file path + chunk index."""
    raw = f"{path}::{chunk_idx}"
    h = hashlib.md5(raw.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def file_insight_id(path):
    """Single deterministic ID for a file (for Neo4j Insight node)."""
    h = hashlib.md5(str(path).encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

# ── Sync gate ─────────────────────────────────────────────────────────────────

def sync_gate(gate, token):
    name = gate['name']
    source_path = gate['source_path']
    targets = gate.get('targets') or ['qdrant:insights']
    if isinstance(targets, str):
        try:
            targets = json.loads(targets)
        except Exception:
            targets = ['qdrant:insights']

    print(f"  Gate: {name} | source: {source_path}")

    vault = Path(source_path)
    if not vault.exists():
        return False, f"Source path not found: {source_path}"

    md_files = list(vault.rglob('*.md'))
    print(f"  Found {len(md_files)} markdown files")

    qdrant_targets = [t.split(':')[1] for t in targets if t.startswith('qdrant:')]
    neo4j_targets  = [t.split(':')[1] for t in targets if t.startswith('neo4j:')]

    if not qdrant_targets:
        return False, "No qdrant target configured"

    collection = qdrant_targets[0]
    do_neo4j   = bool(neo4j_targets) and get_neo4j() is not None
    indexed = 0
    errors = 0

    for md_file in md_files:
        # Skip Obsidian system files
        if '.obsidian' in md_file.parts or md_file.name.startswith('.'):
            continue
        try:
            raw_text = md_file.read_text(errors='ignore')
            frontmatter, body = extract_frontmatter(raw_text)
            if not body.strip():
                continue

            chunks = chunk_markdown(body)
            source_rel = str(md_file.relative_to(vault))
            insight_id = file_insight_id(str(md_file))

            for i, chunk in enumerate(chunks):
                if len(chunk.strip()) < 30:
                    continue
                point_id = deterministic_id(str(md_file), i)
                vector = embed(chunk)
                upsert_point(collection, point_id, vector, {
                    'text': chunk,
                    'source': source_rel,
                    'gate': name,
                    'chunk_idx': i,
                    'has_frontmatter': bool(frontmatter),
                    'indexed_at': __import__('datetime').datetime.now().isoformat()
                })
                indexed += 1

            # Neo4j entity extraction (once per file)
            if do_neo4j:
                extract_and_push_entities(md_file, raw_text, frontmatter, source_rel, insight_id)

        except Exception as e:
            print(f"    Error on {md_file.name}: {e}")
            errors += 1

    msg = f"Indexed {indexed} chunks from {len(md_files)} files ({errors} errors)"
    if do_neo4j:
        msg += " + Neo4j entity extraction"
    return True, msg

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    gate_filter = sys.argv[1] if len(sys.argv) > 1 else None

    print(f"PB: {PB_URL} | Qdrant: {QDRANT_URL} | Neo4j: {'enabled' if NEO4J_URI else 'disabled'}")
    token = pb_auth()
    print("PB auth OK")

    # Load gates — obsidian OR syncthing with neo4j:notes target
    filter_qs = 'enabled=true && (type="obsidian" || type="syncthing")'
    if gate_filter:
        filter_qs += f' && name="{gate_filter}"'
    r = pb_request(
        f'collections/data_gates/records?filter={urllib.parse.quote(filter_qs)}&perPage=50',
        token=token
    )
    gates = r.get('items', [])
    if not gates:
        print("No matching enabled obsidian/syncthing gates found.")
        return

    for gate in gates:
        gate_id = gate['id']
        pb_request(f'collections/data_gates/records/{gate_id}',
                   'PATCH', {'sync_status': 'running'}, token)
        try:
            ok, log = sync_gate(gate, token)
            status = 'ok' if ok else 'error'
        except Exception as e:
            ok, log, status = False, str(e), 'error'

        pb_request(f'collections/data_gates/records/{gate_id}', 'PATCH', {
            'sync_status': status,
            'last_sync': __import__('datetime').datetime.now().isoformat(),
            'sync_log': log,
        }, token)
        print(f"  [{status.upper()}] {gate['name']}: {log}")

    print("\nSync done.")


if __name__ == '__main__':
    main()
