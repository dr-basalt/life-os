<script lang="ts">
  import { onMount } from 'svelte'
  import MetricWidget from '$lib/components/MetricWidget.svelte'
  import { metrics, loading, loadMetrics } from '$lib/stores/okr'
  import { pb } from '$lib/pb'
  import type { MetricEntry } from '$lib/types'

  let entriesByMetric: Record<string, MetricEntry[]> = {}
  let showNew = false
  let newMetric = { name: '', unit: '', category: 'health', emoji: '', target: '', frequency: 'daily', higher_is_better: false }
  let submitting = false

  onMount(async () => {
    await loadMetrics()
    await loadEntries()
  })

  async function loadEntries() {
    if ($metrics.length === 0) return
    const res = await pb.collection('metric_entries').getFullList<MetricEntry>({
      sort: '-recorded_at',
      perPage: 200
    })
    entriesByMetric = res.reduce((acc, e) => {
      if (!acc[e.metric]) acc[e.metric] = []
      acc[e.metric].push(e)
      return acc
    }, {} as Record<string, MetricEntry[]>)
  }

  async function createMetric() {
    if (!newMetric.name.trim()) return
    submitting = true
    try {
      await pb.collection('metrics').create({
        name: newMetric.name.trim(),
        unit: newMetric.unit || undefined,
        category: newMetric.category,
        emoji: newMetric.emoji || undefined,
        target_value: newMetric.target ? parseFloat(newMetric.target) : undefined,
        frequency: newMetric.frequency,
        higher_is_better: newMetric.higher_is_better,
        is_active: true,
      })
      showNew = false
      newMetric = { name: '', unit: '', category: 'health', emoji: '', target: '', frequency: 'daily', higher_is_better: false }
      await loadMetrics()
    } catch (e) {
      console.error(e)
    } finally {
      submitting = false
    }
  }

  // 5 métriques de base recommandées pour démarrer
  const quickStart = [
    { name: 'Poids', unit: 'kg', category: 'health', emoji: '⚖️', target: '80', frequency: 'daily', higher_is_better: false },
    { name: 'CA mensuel', unit: '€', category: 'finance', emoji: '💰', target: '16666', frequency: 'monthly', higher_is_better: true },
    { name: 'Heures deep work', unit: 'h', category: 'work', emoji: '🧠', target: '4', frequency: 'daily', higher_is_better: true },
    { name: 'Victoires semaine', unit: '', category: 'personal', emoji: '⚡', target: '7', frequency: 'weekly', higher_is_better: true },
    { name: 'Sessions sport', unit: '', category: 'health', emoji: '💪', target: '4', frequency: 'weekly', higher_is_better: true },
  ]

  async function addQuickMetric(m: typeof quickStart[0]) {
    await pb.collection('metrics').create({ ...m, is_active: true })
    await loadMetrics()
  }
</script>

<svelte:head><title>Life OS — Métriques</title></svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-xl font-bold text-zinc-100">◈ Métriques</h1>
  <button class="btn btn-primary text-sm" on:click={() => showNew = !showNew}>
    {showNew ? '✕ Annuler' : '+ Métrique'}
  </button>
</div>

<!-- Form nouvelle métrique -->
{#if showNew}
  <div class="card mb-6 space-y-3">
    <h2 class="text-sm font-medium text-zinc-200">Nouvelle métrique</h2>
    <div class="flex gap-2">
      <input bind:value={newMetric.emoji} class="input w-12 text-center" placeholder="⚖️" maxlength="2" />
      <input bind:value={newMetric.name} class="input flex-1" placeholder="Nom de la métrique" />
    </div>
    <div class="grid grid-cols-3 gap-2">
      <div>
        <label class="text-xs text-zinc-500 block mb-1">Catégorie</label>
        <select bind:value={newMetric.category} class="input">
          <option value="health">Santé</option>
          <option value="finance">Finance</option>
          <option value="work">Travail</option>
          <option value="product">Produit</option>
          <option value="personal">Personnel</option>
          <option value="learning">Apprentissage</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-zinc-500 block mb-1">Fréquence</label>
        <select bind:value={newMetric.frequency} class="input">
          <option value="daily">Quotidienne</option>
          <option value="weekly">Hebdo</option>
          <option value="monthly">Mensuelle</option>
          <option value="manual">Manuelle</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-zinc-500 block mb-1">Unité</label>
        <input bind:value={newMetric.unit} class="input" placeholder="kg / € / h" />
      </div>
    </div>
    <div class="flex gap-3 items-center">
      <input bind:value={newMetric.target} type="number" class="input flex-1" placeholder="Objectif cible" />
      <label class="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
        <input type="checkbox" bind:checked={newMetric.higher_is_better} class="accent-indigo-500" />
        Plus = mieux
      </label>
    </div>
    <button class="btn btn-primary w-full justify-center" on:click={createMetric} disabled={submitting || !newMetric.name.trim()}>
      {submitting ? 'Création...' : '✓ Créer la métrique'}
    </button>
  </div>
{/if}

<!-- Quick start si aucune métrique -->
{#if $metrics.length === 0 && !$loading}
  <div class="card mb-6">
    <h2 class="text-sm font-medium text-zinc-200 mb-3">Métriques recommandées pour commencer</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {#each quickStart as m}
        <button
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-left transition-colors"
          on:click={() => addQuickMetric(m)}
        >
          <span>{m.emoji}</span>
          <div>
            <div class="text-sm text-zinc-200">{m.name}</div>
            <div class="text-xs text-zinc-500">Cible: {m.target} {m.unit} · {m.frequency}</div>
          </div>
          <span class="ml-auto text-zinc-600 text-xs">+</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<!-- Grid métriques -->
{#if $loading}
  <div class="text-center text-zinc-500 text-sm py-8">Chargement...</div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each $metrics as metric}
      <MetricWidget {metric} entries={entriesByMetric[metric.id] ?? []} />
    {/each}
  </div>
{/if}
