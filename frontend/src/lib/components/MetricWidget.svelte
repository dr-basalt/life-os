<script lang="ts">
  import type { Metric, MetricEntry } from '$lib/types'
  import { pb } from '$lib/pb'

  export let metric: Metric
  export let entries: MetricEntry[] = []

  let newValue = ''
  let note = ''
  let submitting = false
  let showForm = false

  $: latest = entries[0]
  $: prev = entries[1]
  $: trend = latest && prev
    ? (metric.higher_is_better
        ? latest.value > prev.value ? '▲' : latest.value < prev.value ? '▼' : '─'
        : latest.value < prev.value ? '▲' : latest.value > prev.value ? '▼' : '─')
    : null
  $: trendColor = trend === '▲' ? 'text-emerald-400' : trend === '▼' ? 'text-rose-400' : 'text-zinc-400'

  $: progress = metric.target_value && latest
    ? Math.min(100, Math.round(
        metric.higher_is_better
          ? (latest.value / metric.target_value) * 100
          : ((metric.target_value - Math.max(0, latest.value - metric.target_value)) / metric.target_value) * 100
      ))
    : null

  async function addEntry() {
    if (!newValue) return
    submitting = true
    try {
      const entry = await pb.collection('metric_entries').create<MetricEntry>({
        metric: metric.id,
        value: parseFloat(newValue),
        note: note || undefined,
        recorded_at: new Date().toISOString(),
        source: 'manual'
      })
      entries = [entry, ...entries]
      newValue = ''
      note = ''
      showForm = false
    } catch (e) {
      console.error(e)
    } finally {
      submitting = false
    }
  }
</script>

<div class="card">
  <div class="flex items-start justify-between">
    <div class="flex items-center gap-2">
      {#if metric.emoji}
        <span class="text-xl">{metric.emoji}</span>
      {/if}
      <div>
        <div class="text-sm font-medium text-zinc-200">{metric.name}</div>
        <div class="text-xs text-zinc-500 capitalize">{metric.category} · {metric.frequency}</div>
      </div>
    </div>

    <div class="text-right">
      {#if latest}
        <div class="text-xl font-bold text-zinc-100">
          {latest.value}<span class="text-sm text-zinc-400 ml-1">{metric.unit ?? ''}</span>
        </div>
        {#if trend}
          <span class="text-xs {trendColor}">{trend} vs précédent</span>
        {/if}
      {:else}
        <div class="text-zinc-500 text-sm">—</div>
      {/if}
    </div>
  </div>

  <!-- Progress toward target -->
  {#if progress !== null}
    <div class="mt-3">
      <div class="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Objectif: {metric.target_value} {metric.unit ?? ''}</span>
        <span>{progress}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-bar-fill {progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'}"
          style="width: {progress}%"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Quick entry -->
  {#if showForm}
    <div class="mt-3 flex gap-2">
      <input
        bind:value={newValue}
        type="number"
        step="0.1"
        class="input flex-1"
        placeholder="Valeur {metric.unit ?? ''}"
        on:keydown={e => e.key === 'Enter' && addEntry()}
        autofocus
      />
      <button class="btn btn-primary text-sm" on:click={addEntry} disabled={submitting || !newValue}>
        ✓
      </button>
      <button class="btn btn-ghost text-sm" on:click={() => showForm = false}>✕</button>
    </div>
  {:else}
    <button
      class="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-800 hover:border-zinc-600 rounded-md py-1.5 transition-colors"
      on:click={() => showForm = true}
    >
      + Saisir valeur
    </button>
  {/if}

  <!-- Mini historique (5 dernières) -->
  {#if entries.length > 1}
    <div class="mt-2 flex items-end gap-0.5 h-8">
      {#each entries.slice(0, 8).reverse() as entry}
        {@const maxVal = Math.max(...entries.slice(0, 8).map(e => e.value))}
        {@const pct = maxVal > 0 ? (entry.value / maxVal) * 100 : 0}
        <div
          class="flex-1 rounded-sm bg-indigo-500/30"
          style="height: {Math.max(4, pct)}%"
          title="{entry.value} {metric.unit ?? ''}"
        ></div>
      {/each}
    </div>
  {/if}
</div>
