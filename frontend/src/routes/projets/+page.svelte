<script lang="ts">
  import { pb } from '$lib/pb'
  import { onMount } from 'svelte'

  let projects: any[] = []
  let loading = true
  let filter = 'all'

  function setFilter(f: string) { filter = f }
  let editingId: string | null = null
  let editName = ''
  let editDesc = ''
  let editStatus = ''
  let editGitRepo = ''
  let saving = false

  const statusColors: Record<string, string> = {
    active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    paused:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
    done:     'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    archived: 'bg-zinc-700/50 text-zinc-500 border-zinc-700',
  }

  const statusLabels: Record<string, string> = {
    active: 'Actif', paused: 'En pause', done: 'Terminé', archived: 'Archivé',
  }

  function relativeTime(iso: string): string {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (h < 1) return 'il y a < 1h'
    if (h < 24) return `il y a ${h}h`
    if (d < 7) return `il y a ${d}j`
    if (d < 30) return `il y a ${Math.floor(d/7)} sem`
    return `il y a ${Math.floor(d/30)} mois`
  }

  onMount(async () => {
    try {
      const res = await pb.collection('claude_projects').getFullList({
        sort: '-last_active',
      })
      projects = res
    } catch {}
    loading = false
  })

  $: filtered = filter === 'all' ? projects : projects.filter((p: any) => p.status === filter)

  function startEdit(p: any) {
    editingId = p.id
    editName = p.name
    editDesc = p.description || ''
    editStatus = p.status || 'active'
    editGitRepo = p.git_repo || ''
  }

  async function saveEdit(p: any) {
    saving = true
    try {
      const updated = await pb.collection('claude_projects').update(p.id, {
        name: editName,
        description: editDesc,
        status: editStatus,
        git_repo: editGitRepo,
      })
      projects = projects.map(x => x.id === p.id ? { ...x, ...updated } : x)
      editingId = null
    } catch {}
    saving = false
  }

  const activeCount = (p: any[]) => p.filter(x => x.status === 'active').length
</script>

<svelte:head><title>SternOS — Projets</title></svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Projets</h1>
      <p class="text-zinc-500 text-sm mt-0.5">Sessions Claude Code synchronisées</p>
    </div>
    <div class="flex items-center gap-2">
      {#if !loading}
        <span class="text-xs text-zinc-600 font-mono">{activeCount(projects)} actifs · {projects.length} total</span>
      {/if}
    </div>
  </div>

  <!-- Filtres -->
  <div class="flex gap-2">
    {#each ['all', 'active', 'paused', 'done', 'archived'] as f}
      <button on:click={() => setFilter(f)}
        class="text-xs px-3 py-1.5 rounded-full border transition-colors
          {filter === f
            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
            : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}">
        {f === 'all' ? 'Tous' : statusLabels[f]}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

  {:else if filtered.length === 0}
    <div class="card text-center py-12">
      <div class="text-3xl mb-3">◈</div>
      <p class="text-zinc-400 text-sm mb-2">Aucun projet synchronisé</p>
      <p class="text-zinc-600 text-xs font-mono">Lance le script de sync :</p>
      <code class="text-zinc-500 text-xs block mt-1">python3 scripts/sync-claude-sessions.py</code>
    </div>

  {:else}
    <div class="space-y-3">
      {#each filtered as p}
        <div class="card border border-zinc-800 hover:border-zinc-700 transition-colors">
          {#if editingId === p.id}
            <!-- Mode édition -->
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-zinc-500 text-xs uppercase tracking-wider">Nom</label>
                  <input bind:value={editName} type="text"
                    class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="text-zinc-500 text-xs uppercase tracking-wider">Statut</label>
                  <select bind:value={editStatus}
                    class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
                    <option value="active">Actif</option>
                    <option value="paused">En pause</option>
                    <option value="done">Terminé</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-zinc-500 text-xs uppercase tracking-wider">Description</label>
                <input bind:value={editDesc} type="text" placeholder="Objectif du projet..."
                  class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-zinc-500 text-xs uppercase tracking-wider">GitHub repo</label>
                <input bind:value={editGitRepo} type="url" placeholder="https://github.com/..."
                  class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="flex gap-2">
                <button on:click={() => saveEdit(p)} disabled={saving}
                  class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors disabled:opacity-50">
                  {saving ? '...' : 'Sauvegarder'}
                </button>
                <button on:click={() => editingId = null}
                  class="px-4 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
                  Annuler
                </button>
              </div>
            </div>

          {:else}
            <!-- Mode affichage -->
            <div class="flex items-start gap-4">
              <!-- Status dot -->
              <div class="mt-1 w-2 h-2 rounded-full shrink-0
                {p.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                 p.status === 'paused' ? 'bg-amber-400' :
                 p.status === 'done'   ? 'bg-indigo-400' : 'bg-zinc-600'}">
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-white font-medium text-sm">{p.name}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full border {statusColors[p.status] || statusColors.archived}">
                    {statusLabels[p.status] || p.status}
                  </span>
                  {#if p.git_repo}
                    <a href={p.git_repo} target="_blank"
                      class="text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors">
                      ↗ GitHub
                    </a>
                  {/if}
                </div>

                {#if p.description}
                  <p class="text-zinc-400 text-xs mt-1">{p.description}</p>
                {/if}

                <!-- Path & meta -->
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  <span class="text-zinc-600 text-xs font-mono">{p.path}</span>
                  <span class="text-zinc-700 text-xs">·</span>
                  <span class="text-zinc-600 text-xs">{p.sessions_count || 0} sessions</span>
                  <span class="text-zinc-700 text-xs">·</span>
                  <span class="text-zinc-500 text-xs">{relativeTime(p.last_active)}</span>
                </div>

                <!-- Dernier message -->
                {#if p.last_summary}
                  <p class="text-zinc-600 text-xs mt-2 truncate italic">
                    "{p.last_summary}"
                  </p>
                {/if}

                <!-- Memory title -->
                {#if p.memory_title && p.memory_title !== p.name}
                  <div class="flex items-center gap-1.5 mt-1.5">
                    <span class="text-indigo-400 text-xs">◈</span>
                    <span class="text-zinc-600 text-xs">{p.memory_title}</span>
                  </div>
                {/if}
              </div>

              <!-- Actions -->
              <button on:click={() => startEdit(p)}
                class="text-zinc-600 hover:text-zinc-300 text-xs shrink-0 transition-colors px-2 py-1">
                ✎
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Instructions sync -->
    <div class="card border border-zinc-800/50 bg-zinc-900/50">
      <div class="text-zinc-500 text-xs font-mono mb-2">Pour synchroniser les sessions Claude Code :</div>
      <code class="block text-zinc-400 text-xs bg-zinc-800 rounded-lg px-3 py-2">
        python3 /root/cockpit/stern-os/scripts/sync-claude-sessions.py
      </code>
      <p class="text-zinc-700 text-xs mt-2">Lance ce script depuis ta machine locale après chaque session importante.</p>
    </div>
  {/if}
</div>
