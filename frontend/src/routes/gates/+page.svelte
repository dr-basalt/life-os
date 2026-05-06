<script lang="ts">
  import { pb } from '$lib/pb'
  import { onMount } from 'svelte'

  let gates: any[] = []
  let loading = true
  let syncing: Record<string, boolean> = {}
  let showForm = false
  let editingId: string | null = null
  let filterType = ''
  let filterRole = ''

  // Form state
  let form = {
    name: '', type: 'obsidian', role: 'knowledge_source',
    source_path: '', protocol: '', driver: '',
    parser: 'markdown', targets: 'qdrant:insights',
    auth_mode: 'none', auth_secret_ref: '',
    sync_schedule: '', description: '', enabled: true,
  }
  let saving = false

  const TYPE_ICONS: Record<string, string> = {
    obsidian: '◈', git: '⌥', api: '◎', graphql: '◈', rss: '◉',
    database: '⬡', sql: '⬡', mcp: '⊛', s3: '◫', syncthing: '⟳',
    webhook: '◀', k8s: '⎈', ollama: '◐', smtp: '✉', redis: '⬥',
  }

  const TYPE_COLORS: Record<string, string> = {
    obsidian: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    git:      'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    api:      'text-amber-400 border-amber-500/30 bg-amber-500/10',
    graphql:  'text-pink-400 border-pink-500/30 bg-pink-500/10',
    rss:      'text-orange-400 border-orange-500/30 bg-orange-500/10',
    database: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    sql:      'text-purple-400 border-purple-500/30 bg-purple-500/10',
    mcp:      'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    s3:       'text-blue-400 border-blue-500/30 bg-blue-500/10',
    syncthing:'text-teal-400 border-teal-500/30 bg-teal-500/10',
    webhook:  'text-red-400 border-red-500/30 bg-red-500/10',
    k8s:      'text-blue-400 border-blue-500/30 bg-blue-500/10',
    ollama:   'text-green-400 border-green-500/30 bg-green-500/10',
    smtp:     'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
    redis:    'text-red-400 border-red-500/30 bg-red-500/10',
  }

  const STATUS_COLORS: Record<string, string> = {
    idle:    'bg-zinc-700/50 text-zinc-500',
    running: 'bg-amber-500/15 text-amber-400 animate-pulse',
    error:   'bg-red-500/15 text-red-400',
    ok:      'bg-emerald-500/15 text-emerald-400',
  }

  const ROLE_LABELS: Record<string, string> = {
    knowledge_source: '📚 knowledge',
    ai_provider:      '🤖 ai',
    storage:          '🗄 storage',
    compute:          '⚙️ compute',
    workflow:         '⟳ workflow',
    calendar:         '📅 calendar',
    cache:            '⚡ cache',
    monitor:          '📊 monitor',
    code:             '{ } code',
    data:             '≋ data',
  }

  function relativeTime(iso: string) {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (h < 1) return '< 1h'
    if (h < 24) return `${h}h`
    if (d < 7) return `${d}j`
    return `${Math.floor(d/7)} sem`
  }

  onMount(loadGates)

  async function loadGates() {
    try {
      gates = await pb.collection('data_gates').getFullList({ sort: 'type,name' })
    } catch {}
    loading = false
  }

  function allTypes() { return [...new Set(gates.map(g => g.type))].sort() }
  function allRoles() { return [...new Set(gates.map(g => g.role).filter(Boolean))].sort() }

  $: filtered = gates.filter(g =>
    (!filterType || g.type === filterType) &&
    (!filterRole || g.role === filterRole)
  )

  async function triggerSync(gate: any) {
    syncing = { ...syncing, [gate.id]: true }
    try {
      await fetch(`${import.meta.env.VITE_MCP_URL || ''}/tools/trigger_sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_name: gate.name })
      })
      await loadGates()
    } catch {}
    syncing = { ...syncing, [gate.id]: false }
  }

  function startAdd() {
    editingId = null
    form = {
      name: '', type: 'obsidian', role: 'knowledge_source',
      source_path: '', protocol: '', driver: '',
      parser: 'markdown', targets: 'qdrant:insights',
      auth_mode: 'none', auth_secret_ref: '',
      sync_schedule: '', description: '', enabled: true,
    }
    showForm = true
  }

  function startEdit(g: any) {
    editingId = g.id
    form = {
      name: g.name, type: g.type, role: g.role || 'knowledge_source',
      source_path: g.source_path || '', protocol: g.protocol || '', driver: g.driver || '',
      parser: g.parser || 'markdown',
      targets: Array.isArray(g.targets) ? g.targets.join(', ') : (g.targets || ''),
      auth_mode: g.auth_mode || 'none', auth_secret_ref: g.auth_secret_ref || '',
      sync_schedule: g.sync_schedule || '', description: g.description || '',
      enabled: g.enabled !== false,
    }
    showForm = true
  }

  async function saveGate() {
    saving = true
    const targets = form.targets.split(',').map(t => t.trim()).filter(Boolean)
    const data = { ...form, targets, sync_status: editingId ? undefined : 'idle' }
    try {
      if (editingId) {
        await pb.collection('data_gates').update(editingId, data)
      } else {
        await pb.collection('data_gates').create(data)
      }
      showForm = false
      editingId = null
      await loadGates()
    } catch (e: any) { alert('Erreur: ' + e.message) }
    saving = false
  }

  async function toggleEnabled(gate: any) {
    try {
      await pb.collection('data_gates').update(gate.id, { enabled: !gate.enabled })
      await loadGates()
    } catch {}
  }

  async function deleteGate(gate: any) {
    if (!confirm(`Supprimer "${gate.name}" ?`)) return
    try {
      await pb.collection('data_gates').delete(gate.id)
      await loadGates()
    } catch {}
  }
</script>

<svelte:head><title>SternOS — Data Gates</title></svelte:head>

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Data Gates</h1>
      <p class="text-zinc-500 text-sm">{gates.length} sources · {gates.filter(g=>g.enabled).length} actives</p>
    </div>
    <button on:click={startAdd}
      class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors">
      + Gate
    </button>
  </div>

  <!-- Filters -->
  {#if gates.length > 0}
    <div class="flex items-center gap-2 flex-wrap">
      <select bind:value={filterType}
        class="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500">
        <option value="">Tous types</option>
        {#each allTypes() as t}<option value={t}>{t}</option>{/each}
      </select>
      <select bind:value={filterRole}
        class="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500">
        <option value="">Tous rôles</option>
        {#each allRoles() as r}<option value={r}>{r}</option>{/each}
      </select>
      {#if filterType || filterRole}
        <button on:click={() => { filterType = ''; filterRole = '' }}
          class="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">✕ Reset</button>
      {/if}
    </div>
  {/if}

  <!-- Form -->
  {#if showForm}
    <div class="card border border-indigo-500/30 space-y-4">
      <h2 class="text-sm font-medium text-white">{editingId ? 'Modifier' : 'Nouvelle'} Data Gate</h2>

      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-1">
          <label class="text-zinc-500 text-xs">Nom</label>
          <input bind:value={form.name} placeholder="vault-jarvis"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="text-zinc-500 text-xs">Type</label>
          <select bind:value={form.type}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500">
            {#each ['obsidian','git','api','graphql','rss','database','sql','mcp','s3','syncthing','webhook','k8s','ollama','smtp','redis'] as t}
              <option value={t}>{t}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="text-zinc-500 text-xs">Rôle</label>
          <select bind:value={form.role}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500">
            {#each ['knowledge_source','ai_provider','storage','compute','workflow','calendar','cache','monitor','code','data'] as r}
              <option value={r}>{r}</option>
            {/each}
          </select>
        </div>
      </div>

      <div>
        <label class="text-zinc-500 text-xs">Source path / URL / Connection string</label>
        <input bind:value={form.source_path} placeholder="https://... ou /data/vault ou bolt://..."
          class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
      </div>

      <div class="grid grid-cols-4 gap-3">
        <div>
          <label class="text-zinc-500 text-xs">Parser</label>
          <select bind:value={form.parser}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500">
            {#each ['markdown','json','jsonl','yaml','csv','html','sql','graphql','pdf','rss','cypher','binary'] as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="text-zinc-500 text-xs">Driver</label>
          <input bind:value={form.driver} placeholder="postgres / bolt / redis"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="text-zinc-500 text-xs">Auth mode</label>
          <select bind:value={form.auth_mode}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500">
            {#each ['none','bearer','basic','oauth2','apikey','ssh','mtls'] as a}
              <option value={a}>{a}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="text-zinc-500 text-xs">Secret ref (env var)</label>
          <input bind:value={form.auth_secret_ref} placeholder="LLM_API_KEY"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-zinc-500 text-xs">Targets (séparés par virgule)</label>
          <input bind:value={form.targets} placeholder="qdrant:insights, neo4j:notes"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="text-zinc-500 text-xs">Sync schedule (cron)</label>
          <input bind:value={form.sync_schedule} placeholder="0 3 * * * (daily 3am)"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <div>
        <label class="text-zinc-500 text-xs">Description</label>
        <input bind:value={form.description} placeholder="Source de données pour..."
          class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
      </div>

      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-zinc-400 text-xs cursor-pointer">
          <input type="checkbox" bind:checked={form.enabled} class="accent-indigo-500" />
          Activée
        </label>
        <div class="flex-1" />
        <button on:click={() => { showForm = false }}
          class="px-4 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
          Annuler
        </button>
        <button on:click={saveGate} disabled={saving || !form.name || !form.source_path}
          class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs disabled:opacity-50">
          {saving ? '...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Gates list -->
  {#if loading}
    <div class="flex items-center justify-center h-32">
      <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

  {:else if filtered.length === 0}
    <div class="card text-center py-12">
      <div class="text-3xl mb-3">⊛</div>
      <p class="text-zinc-400 text-sm">Aucune Data Gate{filterType ? ` de type ${filterType}` : ''}</p>
    </div>

  {:else}
    <!-- Group by type -->
    {#each [...new Set(filtered.map(g => g.type))] as type}
      {@const group = filtered.filter(g => g.type === type)}
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs px-2 py-0.5 rounded-full border {TYPE_COLORS[type] || 'text-zinc-400 border-zinc-700 bg-zinc-800'}">
            {TYPE_ICONS[type] || '◌'} {type}
          </span>
          <span class="text-zinc-700 text-xs">{group.length}</span>
        </div>

        <div class="space-y-1.5">
          {#each group as gate}
            <div class="card border border-zinc-800/60 hover:border-zinc-700 transition-colors py-3">
              <div class="flex items-start gap-3">
                <!-- Status -->
                <div class="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0
                  {gate.sync_status === 'ok'      ? 'bg-emerald-400' :
                   gate.sync_status === 'running' ? 'bg-amber-400 animate-pulse' :
                   gate.sync_status === 'error'   ? 'bg-red-400' : 'bg-zinc-700'}">
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-white text-sm font-medium">{gate.name}</span>
                    {#if gate.role}
                      <span class="text-zinc-600 text-xs">{ROLE_LABELS[gate.role] || gate.role}</span>
                    {/if}
                    {#if gate.sync_status && gate.sync_status !== 'idle'}
                      <span class="text-xs px-1.5 py-0.5 rounded {STATUS_COLORS[gate.sync_status] || ''}">
                        {gate.sync_status}
                      </span>
                    {/if}
                    {#if !gate.enabled}
                      <span class="text-zinc-700 text-xs">off</span>
                    {/if}
                  </div>

                  <div class="text-zinc-600 text-xs font-mono mt-0.5 truncate">{gate.source_path}</div>

                  {#if gate.description}
                    <div class="text-zinc-500 text-xs mt-0.5">{gate.description}</div>
                  {/if}

                  <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                    {#if gate.driver}
                      <span class="text-zinc-700 text-xs font-mono">{gate.driver}</span>
                    {/if}
                    {#if gate.auth_mode && gate.auth_mode !== 'none'}
                      <span class="text-zinc-700 text-xs">🔑 {gate.auth_mode}
                        {gate.auth_secret_ref ? `(${gate.auth_secret_ref})` : ''}</span>
                    {/if}
                    {#if gate.targets}
                      {#each (Array.isArray(gate.targets) ? gate.targets : [gate.targets]) as t}
                        <span class="text-zinc-700 text-xs font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded">→ {t}</span>
                      {/each}
                    {/if}
                    {#if gate.sync_schedule}
                      <span class="text-zinc-700 text-xs font-mono">⏱ {gate.sync_schedule}</span>
                    {/if}
                    {#if gate.last_sync}
                      <span class="text-zinc-700 text-xs">sync {relativeTime(gate.last_sync)}</span>
                    {/if}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1 shrink-0">
                  <button on:click={() => toggleEnabled(gate)}
                    class="text-zinc-700 hover:text-zinc-300 text-xs px-1.5 py-1 transition-colors"
                    title={gate.enabled ? 'Désactiver' : 'Activer'}>
                    {gate.enabled ? '◉' : '○'}
                  </button>
                  <button on:click={() => startEdit(gate)}
                    class="text-zinc-700 hover:text-zinc-300 text-xs px-1.5 py-1 transition-colors">✎</button>
                  <button on:click={() => triggerSync(gate)}
                    disabled={syncing[gate.id] || gate.sync_status === 'running' || !gate.enabled}
                    class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors disabled:opacity-30">
                    {syncing[gate.id] ? '...' : '↻'}
                  </button>
                  <button on:click={() => deleteGate(gate)}
                    class="text-zinc-700 hover:text-red-400 text-xs px-1.5 py-1 transition-colors">✕</button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
