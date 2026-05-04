/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Probe: afficher le CREATE TABLE pour _collections
  const info = []
  app.newQuery("SELECT name, sql FROM sqlite_master WHERE type='table' AND name LIKE '\\_\\_%' ESCAPE '\\'").each((r) => {
    info.push(r.name + ': ' + (r.sql || '').substring(0, 300))
  })
  throw new Error('SCHEMA: ' + info.join(' ||| '))
}, (_) => {})
