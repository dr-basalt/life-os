/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: ui_schemas collection
 * Stores declarative UI page schemas (widget registry per page).
 * Idempotent — skips if collection already exists.
 */
migrate((db) => {
  // Skip if already exists
  try {
    const existing = $app.dao().findCollectionByNameOrId('ui_schemas')
    if (existing) {
      console.log('ui_schemas collection already exists, skipping')
      return
    }
  } catch (_) {}

  const collection = new Collection({
    id: 'ui_schemas',
    name: 'ui_schemas',
    type: 'base',
    schema: [
      {
        name: 'page_id',
        type: 'text',
        required: true,
        options: { min: 1, max: 100 }
      },
      {
        name: 'title',
        type: 'text',
        required: true,
        options: { min: 1, max: 200 }
      },
      {
        name: 'intent',
        type: 'text',
        required: false,
        options: { min: 0, max: 500 }
      },
      {
        name: 'layout',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['dashboard', 'list', 'detail', 'form', 'graph', 'fullscreen']
        }
      },
      {
        name: 'widgets',
        type: 'json',
        required: false
      },
      {
        name: 'version',
        type: 'text',
        required: false,
        options: { min: 0, max: 20 }
      },
      {
        name: 'active',
        type: 'bool',
        required: false
      }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_ui_schemas_page_id ON ui_schemas (page_id)'
    ]
  })

  return $app.dao().saveCollection(collection)
}, (db) => {
  // Down: drop collection
  try {
    const col = $app.dao().findCollectionByNameOrId('ui_schemas')
    if (col) return $app.dao().deleteCollection(col)
  } catch (_) {}
})
