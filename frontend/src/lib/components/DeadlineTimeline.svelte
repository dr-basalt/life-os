<script lang="ts">
  import type { Deadline } from '$lib/types'
  import { daysUntil, formatDate, statusBg } from '$lib/types'

  export let deadlines: Deadline[] = []
</script>

<div class="space-y-2">
  {#each deadlines as dl}
    {@const d = daysUntil(dl.due_at)}
    <div class="flex gap-3 items-start">
      <!-- Timeline indicator -->
      <div class="flex flex-col items-center shrink-0 w-6 mt-1">
        <div class="w-2.5 h-2.5 rounded-full {d < 0 ? 'bg-rose-500' : d < 7 ? 'bg-amber-500' : 'bg-zinc-600'} shrink-0"></div>
        <div class="w-px flex-1 bg-zinc-800 mt-1" style="min-height: 16px"></div>
      </div>
      <!-- Content -->
      <div class="flex-1 min-w-0 pb-2">
        <div class="flex items-center gap-2 min-w-0">
          {#if dl.emoji}<span>{dl.emoji}</span>{/if}
          <span class="text-sm text-zinc-200 line-clamp-1">{dl.title}</span>
          <span class="badge {statusBg(dl.status)} text-xs ml-auto shrink-0">{dl.status}</span>
        </div>
        <div class="text-xs {d < 0 ? 'text-rose-400' : d < 7 ? 'text-amber-400' : 'text-zinc-500'} mt-0.5">
          {formatDate(dl.due_at)} · {d < 0 ? `${Math.abs(d)}j de retard` : d === 0 ? "Aujourd'hui" : `${d}j`}
        </div>
      </div>
    </div>
  {/each}
  {#if deadlines.length === 0}
    <p class="text-sm text-zinc-600 text-center py-2">Aucune deadline à venir</p>
  {/if}
</div>
