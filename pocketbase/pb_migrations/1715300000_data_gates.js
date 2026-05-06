migrate((db) => {
  const dao = new Dao(db)

  const collection = new Collection({
    id: 'sternosdatagates1',
    name: 'data_gates',
    type: 'base',
    system: false,
    schema: [
      { name: 'name',        type: 'text',   required: true },
      { name: 'type',        type: 'select', options: { values: ['obsidian', 'git', 'api', 'rss', 'database'] } },
      { name: 'protocol',    type: 'text',   required: false },  // file://, https://, neo4j://
      { name: 'source_path', type: 'text',   required: true },   // vault path, URL, connection string
      { name: 'parser',      type: 'select', options: { values: ['markdown', 'json', 'jsonl', 'cypher', 'rss'] } },
      { name: 'targets',     type: 'json',   required: false },  // ["qdrant:insights", "neo4j:notes"]
      { name: 'enabled',     type: 'bool',   required: false },
      { name: 'last_sync',   type: 'text',   required: false },  // ISO date
      { name: 'sync_status', type: 'select', options: { values: ['idle', 'running', 'error', 'ok'] } },
      { name: 'sync_log',    type: 'text',   required: false },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_data_gates_name ON data_gates (name)'],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  })

  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('data_gates')
  dao.deleteCollection(collection)
})
