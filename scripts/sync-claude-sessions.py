#!/usr/bin/env python3
"""
Sync Claude Code sessions → SternOS PocketBase
Usage: python3 sync-claude-sessions.py
       PB_URL=https://api.stern-os.ori3com.cloud python3 sync-claude-sessions.py
"""

import os, json, sys, re
from pathlib import Path
from datetime import datetime
import urllib.request, urllib.parse

PB_URL    = os.environ.get('PB_URL', 'https://api.stern-os.ori3com.cloud')
PB_EMAIL  = os.environ.get('PB_EMAIL', 'admin@ori3com.cloud')
PB_PASS   = os.environ.get('PB_PASS', 'SternOS2026!')
CLAUDE_DIR = Path(os.environ.get('CLAUDE_DIR', str(Path.home() / '.claude' / 'projects')))

# Noms lisibles pour les projets connus
PROJECT_NAMES = {
    '-root-cockpit-veille':                  'Veille / SternOS',
    '-root-cockpit-meta-lisp-kubernetes':    'Meta-CLU / K8s',
    '-root-cockpit-clusters-evo':            'Clusters EVO',
    '-root-cockpit-archive-globale-s3':      'Archive S3',
    '-root-openclaw-android-app':            'OpenClaw Android',
    '-root-openclaw-acces-gogcli':           'OpenClaw GoGCLI',
    '-root-conduit-android-app':             'Conduit Android',
    '-root-meta-clu':                        'Meta-CLU',
    '-root-cockpit-debug':                   'Debug cockpit',
    '-root-cockpit-vault-to-graph-knowledge':'Vault → Neo4j',
    '-root-troubleshoot-srv-hostinger-archive': 'Troubleshoot Hostinger',
}

def pb_request(path, method='GET', data=None, token=None):
    url = f"{PB_URL}/api/{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = token
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def auth():
    r = pb_request('admins/auth-with-password', 'POST',
                   {'identity': PB_EMAIL, 'password': PB_PASS})
    token = r.get('token')
    if not token:
        print(f"Auth failed: {r}")
        sys.exit(1)
    return token

def extract_sessions(proj_dir):
    sessions = sorted(proj_dir.glob('*.jsonl'), key=lambda f: f.stat().st_mtime, reverse=True)
    if not sessions:
        return 0, None, ''

    last_modified = datetime.fromtimestamp(sessions[0].stat().st_mtime).isoformat()

    # Dernier message assistant
    last_msg = ''
    try:
        lines = sessions[0].read_text(errors='ignore').strip().split('\n')
        for line in reversed(lines):
            try:
                d = json.loads(line)
                if d.get('type') == 'assistant':
                    content = d.get('message', {}).get('content', '')
                    if isinstance(content, list):
                        for c in content:
                            if c.get('type') == 'text':
                                last_msg = c['text'][:200].replace('\n', ' ')
                                break
                    elif isinstance(content, str):
                        last_msg = content[:200].replace('\n', ' ')
                    if last_msg:
                        break
            except:
                pass
    except:
        pass

    return len(sessions), last_modified, last_msg

def extract_memory_title(proj_dir):
    memory_file = proj_dir / 'memory' / 'MEMORY.md'
    if not memory_file.exists():
        return ''
    try:
        first_line = memory_file.read_text().split('\n')[0]
        return first_line.replace('#', '').strip()
    except:
        return ''

def main():
    print(f"Claude dir: {CLAUDE_DIR}")
    print(f"PocketBase: {PB_URL}")

    token = auth()
    print("Auth OK ✓")

    # Lister les projets existants dans PocketBase
    existing = pb_request('collections/projects/records?perPage=200', token=token)
    existing_by_id = {r['claude_id']: r for r in existing.get('items', [])}

    synced = 0
    for proj_dir in sorted(CLAUDE_DIR.iterdir()):
        if not proj_dir.is_dir():
            continue

        claude_id = proj_dir.name
        path = '/' + claude_id.lstrip('-').replace('-', '/')
        name = PROJECT_NAMES.get(claude_id, path.split('/')[-1])

        sessions_count, last_active, last_summary = extract_sessions(proj_dir)
        if sessions_count == 0:
            continue

        memory_title = extract_memory_title(proj_dir)

        payload = {
            'claude_id':      claude_id,
            'path':           path,
            'name':           name,
            'sessions_count': sessions_count,
            'last_active':    last_active or '',
            'last_summary':   last_summary,
            'memory_title':   memory_title,
        }

        existing_record = existing_by_id.get(claude_id)
        if existing_record:
            # Update
            r = pb_request(f"collections/projects/records/{existing_record['id']}",
                           'PATCH', payload, token)
            status = 'updated'
        else:
            # Create avec status par défaut
            payload['status'] = 'active'
            r = pb_request('collections/projects/records', 'POST', payload, token)
            status = 'created'

        if r.get('id'):
            print(f"  ✓ [{status}] {name} — {sessions_count} sessions, last: {last_active[:10] if last_active else '?'}")
            synced += 1
        else:
            print(f"  ✗ {name}: {r}")

    print(f"\nSync terminé — {synced} projets synchronisés")

if __name__ == '__main__':
    main()
