<script lang="ts">
  import { pb } from '$lib/pb'
  import { onMount } from 'svelte'

  let gates: any[] = []
  let loading = true
  let syncing: Record<string, boolean> = {}
  let showAdd = false
  let editingId: string | null = null

  // Form state
  let formName = ''
  let formType = 'obsidian'
  let formSourcePath = ''
  let formParser = 'markdown'
  let formTargets = 'qdrant:insights'
  let formEnabled = true
  let saving = false

  const typeColors: Record<string, string> = {
    obsidian: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    git:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    api:      'bg-amber-500/15 text-amber-400 border-amber-500/30',
    rss:      'bg-orange-500/15 text-orange-400 border-orange-500/30',
    database: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  }

  const statusColors: Record<string, string> = {
    idle:    'bg-zinc-700/50 text-zinc-500 border-zinc-700',
    running: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    error:   'bg-red-500/15 text-red-400 border-red-500/30',
    ok:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  }

  function relativeTime(iso: string): string {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (h < 1) return 'il y a < 1h'
    if (h < 24) return `il y a ${h}h`
    if (d < 7) return `il y a ${d}j`
    return `il y a ${Math.floor(d/7)} sem`
  }

  onMount(async () => {
    await loadGates()
  })

  async function loadGates() {
    try {
      gates = await pb.collection('data_gates').getFullList({ sort: 'name' })
    } catch {}
    loading = false
  }

  async function triggerSync(gate: any) {
    syncing = { ...syncing, [gate.id]: true }
    try {
      const res = await fetch('/api/mcp-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'trigger_sync', params: { gate_name: gate.name } })
      })
      await loadGates()
    } catch {}
    syncing = { ...syncing, [gate.id]: false }
  }

  function startAdd() {
    editingId = null
    formName = ''
    formType = 'obsidian'
    formSourcePath = ''
    formParser = 'markdown'
    formTargets = 'qdrant:insights'
    formEnabled = true
    showAdd = true
  }

  function startEdit(g: any) {
    editingId = g.id
    formName = g.name
    formType = g.type || 'obsidian'
    formSourcePath = g.source_path || ''
    formParser = g.parser || 'markdown'
    formTargets = Array.isArray(g.targets) ? g.targets.join(', ') : (g.targets || 'qdrant:insights')
    formEnabled = g.enabled !== false
    showAdd = true
  }

  async function saveGate() {
    saving = true
    const targets = formTargets.split(',').map(t => t.trim()).filter(Boolean)
    const data = {
      name: formName,
      type: formType,
      source_path: formSourcePath,
      parser: formParser,
      targets,
      enabled: formEnabled,
      sync_status: 'idle',
    }
    try {
      if (editingId) {
        await pb.collection('data_gates').update(editingId, data)
      } else {
        await pb.collection('data_gates').create(data)
      }
      showAdd = false
      editingId = null
      await loadGates()
    } catch (e: any) {
      alert('Erreur: ' + (e.message || e))
    }
    saving = false
  }

  async function toggleEnabled(gate: any) {
    try {
      await pb.collection('data_gates').update(gate.id, { enabled: !gate.enabled })
      await loadGates()
    } catch {}
  }
</script>

<svelte:head><title>SternOS — Data Gates</title></svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Data Gates</h1>
      <p class="text-zinc-500 text-sm mt-0.5">Sources de données → Qdrant / Neo4j</p>
    </div>
    <button on:click={startAdd}
      class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors">
      + Nouvelle gate
    </button>
  </div>

  <!-- Add / Edit form -->
  {#if showAdd}
    <div class="card border border-indigo-500/30">
      <h2 class="text-sm font-medium text-white mb-4">{editingId ? 'Modifier la gate' : 'Nouvelle Data Gate'}</h2>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-zinc-500 text-xs uppercase tracking-wider">Nom</label>
          <input bind:value={formName} type="text" placeholder="vault-jarvis"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="text-zinc-500 text-xs uppercase tracking-wider">Type</label>
          <select bind:value={formType}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
            <option value="obsidian">Obsidian</option>
            <option value="git">Git</option>
            <option value="api">API</option>
            <option value="rss">RSS</option>
            <option value="database">Database</option>
          </select>
        </div>
      </div>

      <div class="mt-3">
        <label class="text-zinc-500 text-xs uppercase tracking-wider">Source path / URL</label>
        <input bind:value={formSourcePath} type="text" placeholder="/root/obsidian-vault ou https://..."
          class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono" />
      </div>

      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label class="text-zinc-500 text-xs uppercase tracking-wider">Parser</label>
          <select bind:value={formParser}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="jsonl">JSONL</option>
            <option value="cypher">Cypher</option>
            <option value="rss">RSS</option>
          </select>
        </div>
        <div>
          <label class="text-zinc-500 text-xs uppercase tracking-wider">Targets (séparés par virgule)</label>
          <input bind:value={formTargets} type="text" placeholder="qdrant:insights, neo4j:notes"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono" />
        </div>
      </div>

      <div class="flex items-center gap-3 mt-4">
        <label class="flex items-center gap-2 text-zinc-400 text-xs cursor-pointer">
          <input type="checkbox" bind:checked={formEnabled} class="accent-indigo-500" />
          Activée
        </label>
        <div class="flex-1" />
        <button on:click={() => { showAdd = false; editingId = null }}
          class="px-4 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
          Annuler
        </button>
        <button on:click={saveGate} disabled={saving || !formName || !formSourcePath}
          class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors disabled:opacity-50">
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

  {:else if gates.length === 0}
    <div class="card text-center py-12">
      <div class="text-3xl mb-3">⊛</div>
      <p class="text-zinc-400 text-sm mb-2">Aucune Data Gate configurée</p>
      <p class="text-zinc-600 text-xs">Ajoute une source de données pour l'indexer dans Qdrant.</p>
    </div>

  {:else}
    <div class="space-y-3">
      {#each gates as gate}
        <div class="card border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div class="flex items-start gap-4">
            <!-- Status dot -->
            <div class="mt-1 w-2 h-2 rounded-full shrink-0
              {gate.sync_status === 'ok'      ? 'bg-emerald-400' :
               gate.sync_status === 'running' ? 'bg-amber-400 animate-pulse' :
               gate.sync_status === 'error'   ? 'bg-red-400' : 'bg-zinc-600'}">
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium text-sm">{gate.name}</span>
                <span class="text-xs px-2 py-0.5 rounded-full border {typeColors[gate.type] || typeColors.obsidian}">
                  {gate.type}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full border {statusColors[gate.sync_status] || statusColors.idle}">
                  {gate.sync_status || 'idle'}
                </span>
                {#if !gate.enabled}
                  <span class="text-xs text-zinc-600">désactivée</span>
                {/if}
              </div>

              <div class="text-zinc-600 text-xs font-mono mt-1 truncate">{gate.source_path}</div>

              <!-- Targets -->
              {#if gate.targets}
                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {#each (Array.isArray(gate.targets) ? gate.targets : [gate.targets]) as t}
                    <span class="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">{t}</span>
                  {/each}
                </div>
              {/if}

              <!-- Last sync -->
              {#if gate.last_sync}
                <div class="text-zinc-600 text-xs mt-1.5">
                  Dernière sync: {relativeTime(gate.last_sync)}
                  {#if gate.sync_log}
                    <span class="text-zinc-700"> · {gate.sync_log.slice(0, 80)}</span>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <button on:click={() => toggleEnabled(gate)}
                class="text-zinc-600 hover:text-zinc-300 text-xs px-2 py-1 transition-colors"
                title={gate.enabled ? 'Désactiver' : 'Activer'}>
                {gate.enabled ? '◉' : '○'}
              </button>
              <button on:click={() => startEdit(gate)}
                class="text-zinc-600 hover:text-zinc-300 text-xs px-2 py-1 transition-colors">
                ✎
              </button>
              <button on:click={() => triggerSync(gate)}
                disabled={syncing[gate.id] || gate.sync_status === 'running' || !gate.enabled}
                class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors disabled:opacity-40">
                {syncing[gate.id] ? '...' : '↻ Sync'}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- CLI instructions -->
  <div class="card border border-zinc-800/50 bg-zinc-900/50">
    <div class="text-zinc-500 text-xs font-mono mb-2">Synchroniser manuellement une gate Obsidian :</div>
    <code class="block text-zinc-400 text-xs bg-zinc-800 rounded-lg px-3 py-2">
      PB_URL=https://api.stern-os.ori3com.cloud OPENAI_API_KEY=sk-... \<br/>
      &nbsp;&nbsp;python3 /opt/stern-os/scripts/sync-obsidian-gate.py [gate_name]
    </code>
    <p class="text-zinc-700 text-xs mt-2">Requiert: <span class="font-mono">OPENAI_API_KEY</span>, accès au vault en local ou en SSH.</p>
  </div>
</div>
