<script lang="ts">
  import type { Victory } from '$lib/types'
  import { formatDate } from '$lib/types'
  import { pb } from '$lib/pb'
  import { loadVictories, victories } from '$lib/stores/okr'

  export let limit = 10

  let newTitle = ''
  let newEmoji = '⚡'
  let newImpact = 7
  let submitting = false

  const typeEmojis: Record<string, string> = {
    milestone: '🏁', habit: '🔥', personal: '💪', professional: '💼',
    product: '🚀', health: '❤️', financial: '💰'
  }

  async function logVictory() {
    if (!newTitle.trim()) return
    submitting = true
    try {
      await pb.collection('victories').create({
        title: newTitle.trim(),
        emoji: newEmoji,
        impact_score: newImpact,
        type: 'milestone',
        celebrated_at: new Date().toISOString()
      })
      newTitle = ''
      await loadVictories()
    } catch (e) {
      console.error(e)
    } finally {
      submitting = false
    }
  }
</script>

<div class="space-y-3">
  <!-- Quick log form -->
  <div class="card">
    <p class="text-xs text-zinc-500 mb-2">Logue une victoire</p>
    <div class="flex gap-2">
      <input
        bind:value={newEmoji}
        class="input w-12 text-center"
        maxlength="2"
        placeholder="⚡"
      />
      <input
        bind:value={newTitle}
        class="input flex-1"
        placeholder="J'ai fait X... lancé Y... terminé Z..."
        on:keydown={e => e.key === 'Enter' && logVictory()}
      />
      <button class="btn btn-primary" on:click={logVictory} disabled={submitting || !newTitle.trim()}>
        {submitting ? '...' : '+'}
      </button>
    </div>
    <div class="flex items-center gap-2 mt-2">
      <span class="text-xs text-zinc-500">Impact:</span>
      <input type="range" min="1" max="10" bind:value={newImpact} class="flex-1 accent-indigo-500" />
      <span class="text-xs text-indigo-400 w-4">{newImpact}</span>
    </div>
  </div>

  <!-- Feed -->
  <div class="space-y-1.5">
    {#each $victories.slice(0, limit) as v}
      <div class="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
        <span class="text-lg mt-0.5 shrink-0">{v.emoji || typeEmojis[v.type] || '⚡'}</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm text-zinc-200 line-clamp-2">{v.title}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-zinc-500">{formatDate(v.created)}</span>
            {#if v.impact_score}
              <span class="text-xs text-amber-400">{'★'.repeat(Math.round(v.impact_score / 2))}</span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
    {#if $victories.length === 0}
      <p class="text-sm text-zinc-600 text-center py-4">Aucune victoire encore — commence !</p>
    {/if}
  </div>
</div>
