migrate((db) => {
  const dao = new Dao(db)

  // Collection projects — sessions Claude Code
  const collection = new Collection({
    id: 'sternosprojects1',
    name: 'projects',
    type: 'base',
    system: false,
    schema: [
      { name: 'claude_id',     type: 'text',   required: true },   // ex: -root-cockpit-veille
      { name: 'path',          type: 'text',   required: true },   // ex: /root/cockpit/veille
      { name: 'name',          type: 'text',   required: true },   // nom lisible
      { name: 'description',   type: 'text',   required: false },
      { name: 'status',        type: 'select', options: { values: ['active','paused','done','archived'] } },
      { name: 'sessions_count',type: 'number', required: false },
      { name: 'last_active',   type: 'text',   required: false },  // ISO date
      { name: 'last_summary',  type: 'text',   required: false },  // dernier msg assistant
      { name: 'memory_title',  type: 'text',   required: false },
      { name: 'git_repo',      type: 'url',    required: false },
      { name: 'tags',          type: 'json',   required: false },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_projects_claude_id ON projects (claude_id)'],
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  })

  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId('projects')
  dao.deleteCollection(collection)
})
