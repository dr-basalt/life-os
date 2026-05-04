<script lang="ts">
  import { onMount } from 'svelte'
  import VictoryLog from '$lib/components/VictoryLog.svelte'
  import { victories, loading, loadVictories } from '$lib/stores/okr'
  import { formatDate } from '$lib/types'

  onMount(() => loadVictories(50))

  const typeEmojis: Record<string, string> = {
    milestone: '🏁', habit: '🔥', personal: '💪', professional: '💼',
    product: '🚀', health: '❤️', financial: '💰'
  }

  // Grouper par semaine
  $: grouped = $victories.reduce((acc, v) => {
    const week = new Date(v.created)
    week.setDate(week.getDate() - week.getDay())
    const key = week.toISOString().split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(v)
    return acc
  }, {} as Record<string, typeof $victories>)

  $: weeks = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))

  // Stats
  $: totalImpact = $victories.reduce((s, v) => s + (v.impact_score ?? 0), 0)
  $: avgImpact = $victories.length ? (totalImpact / $victories.length).toFixed(1) : '0'
</script>

<svelte:head><title>Stern OS — Victoires</title></svelte:head>

<div class="max-w-2xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-xl font-bold text-zinc-100">⚡ Victoires</h1>
    <div class="flex gap-3 text-sm text-zinc-400">
      <span><span class="text-emerald-400 font-bold">{$victories.length}</span> total</span>
      <span><span class="text-amber-400 font-bold">{avgImpact}</span> impact moyen</span>
    </div>
  </div>

  <!-- Quick log -->
  <VictoryLog limit={3} />

  <!-- Feed par semaine -->
  {#if $loading}
    <div class="text-center text-zinc-500 text-sm mt-8">Chargement...</div>
  {:else}
    <div class="mt-6 space-y-6">
      {#each weeks as [weekStart, items]}
        <div>
          <h3 class="text-xs text-zinc-500 mb-2 flex items-center gap-2">
            <span>Semaine du {formatDate(weekStart)}</span>
            <span class="text-zinc-700">——</span>
            <span class="text-amber-400">{items.reduce((s, v) => s + (v.impact_score ?? 0), 0)} pts</span>
          </h3>
          <div class="space-y-1.5">
            {#each items as v}
              <div class="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                <span class="text-xl mt-0.5 shrink-0">{v.emoji || typeEmojis[v.type] || '⚡'}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-zinc-200">{v.title}</p>
                  {#if v.description}
                    <p class="text-xs text-zinc-500 mt-0.5">{v.description}</p>
                  {/if}
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-zinc-600">{formatDate(v.created)}</span>
                    <span class="badge bg-indigo-500/10 text-indigo-400 text-xs">{v.type}</span>
                    {#if v.impact_score}
                      <div class="flex gap-0.5">
                        {#each Array(10) as _, i}
                          <div class="w-1.5 h-1.5 rounded-full {i < v.impact_score ? 'bg-amber-400' : 'bg-zinc-700'}"></div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}

      {#if $victories.length === 0}
        <div class="card text-center py-12">
          <div class="text-4xl mb-3">⚡</div>
          <p class="text-zinc-400 text-sm">Pas encore de victoires.</p>
          <p class="text-zinc-600 text-xs mt-1">Même petite = compte. Log-la !</p>
        </div>
      {/if}
    </div>
  {/if}
</div>
