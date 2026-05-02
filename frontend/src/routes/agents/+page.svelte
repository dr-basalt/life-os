<script lang="ts">
  import { onMount } from 'svelte'
  import { agents, loading, loadAgents } from '$lib/stores/okr'
  import { pb } from '$lib/pb'
  import type { Agent } from '$lib/types'
  import { statusBg, formatDate } from '$lib/types'

  let showForm = false
  let submitting = false
  let runningId: string | null = null
  let newAgent = {
    name: '', description: '', type: 'webhook', trigger_type: 'manual',
    schedule: '', emoji: '', config: '{}'
  }

  onMount(() => loadAgents())

  const typeDescriptions: Record<string, string> = {
    windmill: 'Script Windmill (Python/TS/Go)',
    n8n: 'Workflow n8n',
    webhook: 'Appel HTTP/webhook',
    llm_chain: 'Chaîne LLM (Claude API)',
    cron: 'Tâche planifiée',
    mcp: 'Tool MCP'
  }

  async function createAgent() {
    if (!newAgent.name.trim()) return
    submitting = true
    try {
      let config = {}
      try { config = JSON.parse(newAgent.config) } catch { config = { raw: newAgent.config } }
      await pb.collection('agents').create({
        name: newAgent.name.trim(),
        description: newAgent.description || undefined,
        type: newAgent.type,
        trigger_type: newAgent.trigger_type,
        schedule: newAgent.schedule || undefined,
        emoji: newAgent.emoji || undefined,
        config,
        status: 'idle',
      })
      showForm = false
      newAgent = { name: '', description: '', type: 'webhook', trigger_type: 'manual', schedule: '', emoji: '', config: '{}' }
      await loadAgents()
    } catch (e) { console.error(e) }
    finally { submitting = false }
  }

  async function runAgent(agent: Agent) {
    runningId = agent.id
    try {
      await pb.collection('agents').update(agent.id, { status: 'running', last_run_at: new Date().toISOString() })
      // Si c'est un webhook, appeler l'URL du config
      if (agent.type === 'webhook' && agent.config?.url) {
        await fetch(agent.config.url as string, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      }
      // TODO: implémenter appel Windmill API, n8n webhook, etc.
      await new Promise(r => setTimeout(r, 1000)) // placeholder
      await pb.collection('agents').update(agent.id, { status: 'idle' })
      await loadAgents()
    } catch (e) {
      await pb.collection('agents').update(agent.id, { status: 'error' })
    } finally {
      runningId = null
    }
  }

  const statusIcon: Record<string, string> = {
    idle: '○', running: '◌', paused: '⏸', error: '✕', disabled: '—'
  }
</script>

<svelte:head><title>Life OS — Agents</title></svelte:head>

<div class="flex items-center justify-between mb-6">
  <div>
    <h1 class="text-xl font-bold text-zinc-100">⬟ Agents</h1>
    <p class="text-xs text-zinc-500 mt-0.5">Automatisations connectées à ton Life OS</p>
  </div>
  <button class="btn btn-primary text-sm" on:click={() => showForm = !showForm}>
    {showForm ? '✕' : '+ Agent'}
  </button>
</div>

<!-- Form -->
{#if showForm}
  <div class="card mb-6 space-y-3">
    <h2 class="text-sm font-medium text-zinc-200">Nouvel agent</h2>
    <div class="flex gap-2">
      <input bind:value={newAgent.emoji} class="input w-12 text-center" placeholder="⬟" maxlength="2" />
      <input bind:value={newAgent.name} class="input flex-1" placeholder="Nom de l'agent" />
    </div>
    <input bind:value={newAgent.description} class="input" placeholder="Description (optionnel)" />
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-xs text-zinc-500 block mb-1">Type</label>
        <select bind:value={newAgent.type} class="input">
          {#each Object.entries(typeDescriptions) as [v, label]}
            <option value={v}>{label}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="text-xs text-zinc-500 block mb-1">Déclencheur</label>
        <select bind:value={newAgent.trigger_type} class="input">
          <option value="manual">Manuel</option>
          <option value="schedule">Planifié (cron)</option>
          <option value="event">Événement PB</option>
          <option value="webhook">Webhook entrant</option>
        </select>
      </div>
    </div>
    {#if newAgent.trigger_type === 'schedule'}
      <input bind:value={newAgent.schedule} class="input" placeholder="Cron: 0 8 * * * (chaque jour à 8h)" />
    {/if}
    <div>
      <label class="text-xs text-zinc-500 block mb-1">Config JSON</label>
      <textarea bind:value={newAgent.config} class="input font-mono text-xs" rows="3"
        placeholder='{"url": "https://...", "workflowId": "...", "apiKey": "..."}'></textarea>
    </div>
    <button class="btn btn-primary w-full justify-center" on:click={createAgent} disabled={submitting || !newAgent.name.trim()}>
      {submitting ? 'Création...' : '✓ Créer l\'agent'}
    </button>
  </div>
{/if}

<!-- Liste -->
{#if $loading}
  <div class="text-center text-zinc-500 text-sm py-8">Chargement...</div>
{:else if $agents.length === 0}
  <div class="card text-center py-12">
    <div class="text-4xl mb-3">⬟</div>
    <p class="text-zinc-400 text-sm">Aucun agent configuré.</p>
    <p class="text-zinc-600 text-xs mt-1">Connecte Windmill, un webhook, ou une chaîne Claude.</p>
    <button class="btn btn-primary mx-auto mt-4 text-sm" on:click={() => showForm = true}>+ Premier agent</button>
  </div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {#each $agents as agent}
      <div class="card hover:border-zinc-600 transition-colors">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xl shrink-0">{agent.emoji || '⬟'}</span>
            <div class="min-w-0">
              <div class="font-medium text-zinc-200 line-clamp-1">{agent.name}</div>
              <div class="text-xs text-zinc-500">{typeDescriptions[agent.type]}</div>
            </div>
          </div>
          <span class="badge {statusBg(agent.status)} shrink-0">
            {statusIcon[agent.status] || '○'} {agent.status}
          </span>
        </div>

        {#if agent.description}
          <p class="text-xs text-zinc-500 mt-2 line-clamp-2">{agent.description}</p>
        {/if}

        <div class="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <div class="text-xs text-zinc-600">
            {agent.trigger_type === 'schedule' && agent.schedule
              ? `◷ ${agent.schedule}`
              : agent.trigger_type}
            {#if agent.last_run_at}
              <span class="ml-2">· {formatDate(agent.last_run_at)}</span>
            {/if}
          </div>
          <button
            class="btn btn-ghost text-xs py-1 px-2"
            disabled={runningId === agent.id || agent.status === 'running'}
            on:click={() => runAgent(agent)}
          >
            {runningId === agent.id ? '...' : '▷ Run'}
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
