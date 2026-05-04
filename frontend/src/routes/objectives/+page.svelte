<script lang="ts">
  import { onMount } from 'svelte'
  import OKRCard from '$lib/components/OKRCard.svelte'
  import { objectives, keyResults, loading, loadObjectives, loadKeyResults } from '$lib/stores/okr'
  import { statusBg } from '$lib/types'

  let filter: 'all' | 'active' | 'completed' = 'active'

  onMount(async () => {
    await Promise.all([loadObjectives(), loadKeyResults()])
  })

  $: filtered = $objectives.filter(o => filter === 'all' ? true : o.status === filter)
  $: counts = {
    all: $objectives.length,
    active: $objectives.filter(o => o.status === 'active').length,
    completed: $objectives.filter(o => o.status === 'completed').length,
  }
</script>

<svelte:head><title>Life OS — OKRs</title></svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-xl font-bold text-zinc-100">Objectifs & Key Results</h1>
  <a href="/objectives/new" class="btn btn-primary text-sm">+ Nouvel OKR</a>
</div>

<!-- Filtres -->
<div class="flex gap-2 mb-6">
  {#each ['active', 'completed', 'all'] as f}
    <button
      class="btn text-sm {filter === f ? 'btn-primary' : 'btn-ghost'}"
      on:click={() => filter = f}
    >
      {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Terminés'}
      <span class="ml-1 text-xs opacity-60">{counts[f]}</span>
    </button>
  {/each}
</div>

{#if $loading}
  <div class="text-zinc-500 text-sm text-center py-8">Chargement...</div>
{:else if filtered.length === 0}
  <div class="card text-center py-12">
    <div class="text-4xl mb-3">◎</div>
    <p class="text-zinc-400 mb-4">Aucun objectif {filter === 'active' ? 'actif' : filter}.</p>
    <a href="/objectives/new" class="btn btn-primary mx-auto">Créer un OKR</a>
  </div>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {#each filtered as obj}
      <OKRCard objective={obj} keyResults={$keyResults} />
    {/each}
  </div>
{/if}
