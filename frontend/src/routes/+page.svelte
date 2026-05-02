<script lang="ts">
  import { onMount } from 'svelte'
  import OKRCard from '$lib/components/OKRCard.svelte'
  import VictoryLog from '$lib/components/VictoryLog.svelte'
  import {
    loadAll, activeObjectives, keyResults, victories, deadlines, metrics,
    loading, loadKeyResults
  } from '$lib/stores/okr'
  import { daysUntil, formatDate, statusBg } from '$lib/types'

  onMount(async () => {
    await loadAll()
    await loadKeyResults()
  })

  // Stats rapides
  $: totalActive = $activeObjectives.length
  $: totalVictories = $victories.length
  $: nextDeadline = $deadlines[0]
  $: overdueCount = $deadlines.filter(d => daysUntil(d.due_at) < 0).length
</script>

<svelte:head><title>Life OS — Dashboard</title></svelte:head>

{#if $loading}
  <div class="flex items-center justify-center h-32">
    <div class="text-zinc-500 text-sm">Chargement...</div>
  </div>
{:else}
  <!-- ── Stats bar ──────────────────────────────────────────────────────── -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    <div class="card text-center">
      <div class="text-2xl font-bold text-indigo-400">{totalActive}</div>
      <div class="text-xs text-zinc-500 mt-0.5">OKRs actifs</div>
    </div>
    <div class="card text-center">
      <div class="text-2xl font-bold text-emerald-400">{totalVictories}</div>
      <div class="text-xs text-zinc-500 mt-0.5">Victoires</div>
    </div>
    <div class="card text-center">
      <div class="text-2xl font-bold {overdueCount > 0 ? 'text-rose-400' : 'text-zinc-400'}">{overdueCount}</div>
      <div class="text-xs text-zinc-500 mt-0.5">En retard</div>
    </div>
    <div class="card text-center">
      {#if nextDeadline}
        {@const d = daysUntil(nextDeadline.due_at)}
        <div class="text-2xl font-bold {d < 7 ? 'text-amber-400' : 'text-zinc-300'}">{Math.abs(d)}j</div>
        <div class="text-xs text-zinc-500 mt-0.5 line-clamp-1">{nextDeadline.title}</div>
      {:else}
        <div class="text-2xl font-bold text-zinc-600">—</div>
        <div class="text-xs text-zinc-500 mt-0.5">Prochaine deadline</div>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- ── OKRs ──────────────────────────────────────────────────────────── -->
    <div class="lg:col-span-2 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-zinc-200">Objectifs actifs</h2>
        <a href="/objectives/new" class="btn btn-ghost text-xs py-1 px-2">+ Ajouter</a>
      </div>

      {#if $activeObjectives.length === 0}
        <div class="card text-center py-8">
          <div class="text-3xl mb-2">◎</div>
          <p class="text-zinc-400 text-sm">Pas encore d'objectif actif.</p>
          <a href="/objectives/new" class="btn btn-primary text-sm mt-3 mx-auto">Créer mon premier OKR</a>
        </div>
      {:else}
        {#each $activeObjectives as obj}
          <OKRCard objective={obj} keyResults={$keyResults} />
        {/each}
      {/if}
    </div>

    <!-- ── Sidebar ────────────────────────────────────────────────────────── -->
    <div class="space-y-6">
      <!-- Deadlines -->
      {#if $deadlines.length > 0}
        <div>
          <h2 class="font-semibold text-zinc-200 mb-3">Deadlines</h2>
          <div class="space-y-2">
            {#each $deadlines.slice(0, 5) as dl}
              {@const d = daysUntil(dl.due_at)}
              <div class="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                <span class="text-base">{dl.emoji || '◷'}</span>
                <div class="min-w-0 flex-1">
                  <div class="text-sm text-zinc-200 line-clamp-1">{dl.title}</div>
                  <div class="text-xs {d < 0 ? 'text-rose-400' : d < 7 ? 'text-amber-400' : 'text-zinc-500'}">
                    {d < 0 ? `Expiré il y a ${Math.abs(d)}j` : d === 0 ? "Aujourd'hui !" : `Dans ${d}j`}
                  </div>
                </div>
                <span class="badge {statusBg(dl.status)} text-xs shrink-0">{dl.status}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Victoires -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-zinc-200">Victoires</h2>
          <a href="/victories" class="text-xs text-zinc-500 hover:text-zinc-300">Tout voir →</a>
        </div>
        <VictoryLog limit={5} />
      </div>
    </div>
  </div>
{/if}
