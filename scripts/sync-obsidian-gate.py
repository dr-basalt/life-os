#!/usr/bin/env python3
"""
sync-obsidian-gate.py — Sync an Obsidian vault Data Gate to Qdrant
Usage:
  python3 sync-obsidian-gate.py [gate_name]
  python3 sync-obsidian-gate.py  # syncs all enabled obsidian gates

Env vars:
  PB_URL, PB_EMAIL, PB_PASS
  QDRANT_URL
  OPENAI_API_KEY
"""

import os, json, sys, re, hashlib
from pathlib import Path
import urllib.request, urllib.parse

PB_URL    = os.environ.get('PB_URL', 'http://localhost:8090')
PB_EMAIL  = os.environ.get('PB_EMAIL', os.environ.get('PB_ADMIN_EMAIL', 'admin@ori3com.cloud'))
PB_PASS   = os.environ.get('PB_PASS', os.environ.get('PB_ADMIN_PASSWORD', 'SternOS2026!'))
QDRANT_URL = os.environ.get('QDRANT_URL', 'http://localhost:6333')
OPENAI_KEY = os.environ.get('OPENAI_API_KEY', os.environ.get('LLM_API_KEY', ''))

CHUNK_SIZE = 800  # chars per chunk


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
    url = f"{QDRANT_URL}/collections/{collection}/points"
    http_post(url, {'points': [{'id': point_id, 'vector': vector, 'payload': payload}]})


def strip_frontmatter(text):
    """Remove YAML frontmatter block."""
    if text.startswith('---'):
        end = text.find('\n---', 3)
        if end != -1:
            return text[end + 4:].strip()
    return text


def chunk_markdown(text, max_chars=CHUNK_SIZE):
    """Split by headings or by char limit."""
    sections = re.split(r'(?m)^#{1,3} ', text)
    chunks = []
    for s in sections:
        s = s.strip()
        if not s:
            continue
        # Sub-split if too long
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


def sync_gate(gate, token):
    name = gate['name']
    source_path = gate['source_path']
    targets = gate.get('targets') or ['qdrant:insights']
    if isinstance(targets, str):
        targets = json.loads(targets)

    print(f"  Gate: {name} | source: {source_path}")

    vault = Path(source_path)
    if not vault.exists():
        return False, f"Source path not found: {source_path}"

    md_files = list(vault.rglob('*.md'))
    print(f"  Found {len(md_files)} markdown files")

    qdrant_targets = [t.split(':')[1] for t in targets if t.startswith('qdrant:')]
    if not qdrant_targets:
        return False, "No qdrant target configured"

    collection = qdrant_targets[0]
    indexed = 0
    errors = 0

    for md_file in md_files:
        try:
            text = md_file.read_text(errors='ignore')
            text = strip_frontmatter(text)
            if not text.strip():
                continue

            chunks = chunk_markdown(text)
            for i, chunk in enumerate(chunks):
                if len(chunk.strip()) < 30:
                    continue
                point_id = deterministic_id(str(md_file), i)
                vector = embed(chunk)
                upsert_point(collection, point_id, vector, {
                    'text': chunk,
                    'source': str(md_file.relative_to(vault)),
                    'gate': name,
                    'chunk_idx': i,
                    'indexed_at': __import__('datetime').datetime.now().isoformat()
                })
                indexed += 1
        except Exception as e:
            print(f"    Error on {md_file.name}: {e}")
            errors += 1

    msg = f"Indexed {indexed} chunks from {len(md_files)} files ({errors} errors)"
    return True, msg


def main():
    gate_filter = sys.argv[1] if len(sys.argv) > 1 else None

    print(f"PB: {PB_URL} | Qdrant: {QDRANT_URL}")
    token = pb_auth()
    print("PB auth OK")

    # Load gates
    filter_qs = 'enabled=true && type="obsidian"'
    if gate_filter:
        filter_qs += f' && name="{gate_filter}"'
    r = pb_request(
        f'collections/data_gates/records?filter={urllib.parse.quote(filter_qs)}&perPage=50',
        token=token
    )
    gates = r.get('items', [])
    if not gates:
        print("No matching enabled obsidian gates found.")
        return

    for gate in gates:
        gate_id = gate['id']
        # Mark running
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
