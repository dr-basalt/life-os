<script lang="ts">
  import type { Objective, KeyResult } from '$lib/types'
  import { krProgress, statusBg, daysUntil, formatDate } from '$lib/types'

  export let objective: Objective
  export let keyResults: KeyResult[] = []

  $: krs = keyResults.filter(kr => kr.objective === objective.id)
  $: avgProgress = krs.length
    ? Math.round(krs.reduce((s, kr) => s + krProgress(kr), 0) / krs.length)
    : 0

  $: progressColor = avgProgress >= 70
    ? 'bg-emerald-500'
    : avgProgress >= 40
      ? 'bg-amber-500'
      : 'bg-rose-500'
</script>

<div class="card hover:border-zinc-600 transition-colors">
  <!-- Header -->
  <div class="flex items-start justify-between gap-3 mb-3">
    <div class="flex items-center gap-2 min-w-0">
      {#if objective.emoji}
        <span class="text-xl shrink-0">{objective.emoji}</span>
      {/if}
      <div class="min-w-0">
        <a href="/objectives/{objective.id}" class="font-semibold text-zinc-100 hover:text-indigo-400 transition-colors line-clamp-1">
          {objective.title}
        </a>
        {#if objective.okr_cycle}
          <div class="text-xs text-zinc-500 mt-0.5">{objective.okr_cycle}</div>
        {/if}
      </div>
    </div>
    <span class="badge {statusBg(objective.status)} shrink-0">{objective.status}</span>
  </div>

  <!-- Barre de progression globale -->
  <div class="mb-3">
    <div class="flex justify-between text-xs text-zinc-400 mb-1">
      <span>{krs.length} key results</span>
      <span class="font-medium {avgProgress >= 70 ? 'text-emerald-400' : avgProgress >= 40 ? 'text-amber-400' : 'text-rose-400'}">
        {avgProgress}%
      </span>
    </div>
    <div class="progress-bar">
      <div class="progress-bar-fill {progressColor}" style="width: {avgProgress}%"></div>
    </div>
  </div>

  <!-- Key Results -->
  {#if krs.length > 0}
    <div class="space-y-2 border-t border-zinc-800 pt-3">
      {#each krs as kr}
        {@const pct = krProgress(kr)}
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-zinc-300 line-clamp-1 flex-1">{kr.title}</span>
            <span class="text-zinc-400 ml-2 shrink-0">
              {#if kr.type === 'numeric'}
                {kr.current_value ?? 0}{kr.unit ? ' '+kr.unit : ''} / {kr.target_value}{kr.unit ? ' '+kr.unit : ''}
              {:else if kr.type === 'boolean'}
                {kr.status === 'completed' ? '✓' : '○'}
              {:else}
                {pct}%
              {/if}
            </span>
          </div>
          <div class="progress-bar" style="height:3px">
            <div
              class="progress-bar-fill {kr.status === 'on_track' ? 'bg-emerald-500' : kr.status === 'at_risk' ? 'bg-amber-500' : 'bg-rose-500'}"
              style="width: {pct}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Footer deadline -->
  {#if objective.deadline}
    {@const days = daysUntil(objective.deadline)}
    <div class="mt-3 text-xs {days < 0 ? 'text-rose-400' : days < 14 ? 'text-amber-400' : 'text-zinc-500'}">
      {days < 0 ? `⚠ Expiré il y a ${Math.abs(days)}j` : `◷ ${formatDate(objective.deadline)} (${days}j)`}
    </div>
  {/if}
</div>
