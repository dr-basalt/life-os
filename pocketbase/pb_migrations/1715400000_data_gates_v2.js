// data_gates_v2 — extend types, parsers, add role/auth/driver/description/sync_schedule
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('data_gates')

  // Extend 'type' select options
  const typeField = collection.schema.getFieldByName('type')
  if (typeField) {
    typeField.options.values = [
      'obsidian',   // Obsidian vault (markdown notes)
      'git',        // Git repository
      'api',        // REST API
      'graphql',    // GraphQL endpoint
      'rss',        // RSS/Atom feed
      'database',   // Generic database / graph db (Neo4j, Qdrant)
      'sql',        // SQL database (PostgreSQL, MySQL, SQLite)
      'mcp',        // MCP server connector
      's3',         // S3-compatible object storage
      'syncthing',  // Syncthing shared folder
      'webhook',    // Incoming webhook
      'k8s',        // Kubernetes API
      'ollama',     // Ollama local LLM API
      'smtp',       // Email SMTP/IMAP
      'redis',      // Redis / KV store
    ]
  }

  // Extend 'parser' select options
  const parserField = collection.schema.getFieldByName('parser')
  if (parserField) {
    parserField.options.values = [
      'markdown',  // .md files
      'json',      // JSON API responses
      'jsonl',     // JSON Lines / NDJSON
      'yaml',      // YAML configs / front-matter
      'csv',       // Tabular CSV data
      'html',      // HTML / web scraping
      'sql',       // SQL query results
      'graphql',   // GraphQL query results
      'pdf',       // PDF documents
      'rss',       // RSS/Atom XML
      'cypher',    // Neo4j Cypher query results
      'binary',    // Raw binary (images, archives)
    ]
  }

  // Add: role — what this gate does in the system
  collection.schema.addField(new SchemaField({
    name: 'role',
    type: 'select',
    options: {
      values: [
        'knowledge_source',  // feeds Neo4j / Qdrant
        'ai_provider',       // LLM / embedding API
        'storage',           // S3, MinIO, archive
        'compute',           // K8s, Windmill, n8n runner
        'workflow',          // n8n, Windmill, Flowise
        'calendar',          // Google Cal, Outlook
        'cache',             // Redis, memcache
        'monitor',           // observability, traces
        'code',              // Git repo source
        'data',              // raw data source
      ]
    }
  }))

  // Add: auth_mode — authentication method
  collection.schema.addField(new SchemaField({
    name: 'auth_mode',
    type: 'select',
    options: { values: ['none', 'bearer', 'basic', 'oauth2', 'apikey', 'ssh', 'mtls'] }
  }))

  // Add: auth_secret_ref — name of env var holding the secret (never store secrets here)
  collection.schema.addField(new SchemaField({
    name: 'auth_secret_ref',
    type: 'text',
    required: false
  }))

  // Add: description
  collection.schema.addField(new SchemaField({
    name: 'description',
    type: 'text',
    required: false
  }))

  // Add: sync_schedule — cron expression for auto-sync
  collection.schema.addField(new SchemaField({
    name: 'sync_schedule',
    type: 'text',
    required: false
  }))

  // Add: driver — specific driver/variant (postgres, sqlite, neo4j, qdrant, redis, mongo, bolt)
  collection.schema.addField(new SchemaField({
    name: 'driver',
    type: 'text',
    required: false
  }))

  dao.saveCollection(collection)
}, (db) => {
  // rollback: remove added fields
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('data_gates')
  for (const name of ['role', 'auth_mode', 'auth_secret_ref', 'description', 'sync_schedule', 'driver']) {
    const f = collection.schema.getFieldByName(name)
    if (f) collection.schema.removeField(f.id)
  }
  dao.saveCollection(collection)
})
