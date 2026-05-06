#!/usr/bin/env node
/**
 * fix-pb-schema.js — Corriger les champs select avec maxSelect=0 dans PocketBase
 * Run via: docker exec sternos-mcp node /opt/stern-os/scripts/fix-pb-schema.js
 * Or:      make fix-pb-schema
 *
 * Problème: les migrations PocketBase qui utilisent addField() ne posent pas
 * maxSelect sur les champs select, laissant maxSelect=0 (invalide).
 * Ce script patch tous les select fields à maxSelect=1 et les json fields
 * à maxSize=2000000.
 */

const PB    = process.env.PB_URL            || 'http://sternos-pb:8090'
const EMAIL = process.env.PB_ADMIN_EMAIL    || 'admin@ori3com.cloud'
const PASS  = process.env.PB_ADMIN_PASSWORD || 'SternOS2026!'

const COLLECTIONS_TO_FIX = ['data_gates']

async function main() {
  const auth = await (await fetch(`${PB}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  })).json()
  const token = auth.token
  if (!token) { console.error('Auth failed:', auth); process.exit(1) }
  console.log('Auth OK')

  for (const colName of COLLECTIONS_TO_FIX) {
    const col = await (await fetch(`${PB}/api/collections/${colName}`, {
      headers: { Authorization: token }
    })).json()

    let fixed = 0
    const schema = col.schema?.map(f => {
      if (f.type === 'select' && f.options?.maxSelect === 0) {
        fixed++
        return { ...f, options: { ...f.options, maxSelect: 1 } }
      }
      if (f.type === 'json' && f.options?.maxSize === 0) {
        fixed++
        return { ...f, options: { ...f.options, maxSize: 2000000 } }
      }
      return f
    })

    if (fixed === 0) {
      console.log(`${colName}: no fix needed`)
      continue
    }

    const r = await (await fetch(`${PB}/api/collections/${colName}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ schema })
    })).json()

    if (r.id) console.log(`${colName}: fixed ${fixed} fields OK`)
    else console.error(`${colName}: patch failed`, JSON.stringify(r).slice(0, 200))
  }
}

main()
