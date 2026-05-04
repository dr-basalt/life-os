<script lang="ts">
  import { pb } from '$lib/pb'
  import { goto } from '$app/navigation'

  let title = ''
  let description = ''
  let type: string = 'business'
  let deadline = ''
  let okr_cycle = '2026-H2'
  let emoji = ''
  let confidence = 70
  let submitting = false
  let error = ''

  // KRs à créer avec l'objectif
  let krs: { title: string; type: string; unit: string; target: string }[] = [
    { title: '', type: 'numeric', unit: '', target: '' }
  ]

  function addKR() {
    krs = [...krs, { title: '', type: 'numeric', unit: '', target: '' }]
  }

  function removeKR(i: number) {
    krs = krs.filter((_, idx) => idx !== i)
  }

  async function submit() {
    if (!title.trim()) { error = 'Le titre est requis'; return }
    submitting = true
    error = ''
    try {
      const obj = await pb.collection('objectives').create({
        title: title.trim(),
        description: description || undefined,
        type,
        status: 'active',
        deadline: deadline || undefined,
        okr_cycle: okr_cycle || undefined,
        emoji: emoji || undefined,
        confidence,
      })

      // Créer les KRs associés
      for (const kr of krs.filter(k => k.title.trim())) {
        await pb.collection('key_results').create({
          objective: obj.id,
          title: kr.title.trim(),
          type: kr.type,
          unit: kr.unit || undefined,
          target_value: kr.target ? parseFloat(kr.target) : undefined,
          current_value: 0,
          status: 'on_track',
        })
      }

      goto('/objectives')
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Erreur lors de la création'
    } finally {
      submitting = false
    }
  }
</script>

<svelte:head><title>Stern OS — Nouvel OKR</title></svelte:head>

<div class="max-w-2xl mx-auto">
  <div class="flex items-center gap-3 mb-6">
    <a href="/objectives" class="text-zinc-400 hover:text-zinc-200 text-sm">← OKRs</a>
    <h1 class="text-xl font-bold text-zinc-100">Nouvel Objectif</h1>
  </div>

  {#if error}
    <div class="bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2 text-sm text-rose-400 mb-4">
      {error}
    </div>
  {/if}

  <div class="card space-y-4 mb-4">
    <h2 class="font-medium text-zinc-200 text-sm">L'objectif</h2>

    <div class="flex gap-2">
      <div class="w-16">
        <label class="block text-xs text-zinc-500 mb-1">Emoji</label>
        <input bind:value={emoji} class="input text-center" placeholder="🎯" maxlength="2" />
      </div>
      <div class="flex-1">
        <label class="block text-xs text-zinc-500 mb-1">Titre *</label>
        <input bind:value={title} class="input" placeholder="Perdre 20kg d'ici octobre..." />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-zinc-500 mb-1">Type</label>
        <select bind:value={type} class="input">
          <option value="life">Vie personnelle</option>
          <option value="business">Business</option>
          <option value="health">Santé</option>
          <option value="product">Produit</option>
          <option value="learning">Apprentissage</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-zinc-500 mb-1">Cycle OKR</label>
        <input bind:value={okr_cycle} class="input" placeholder="2026-H2" />
      </div>
    </div>

    <div>
      <label class="block text-xs text-zinc-500 mb-1">Deadline</label>
      <input bind:value={deadline} type="date" class="input" />
    </div>

    <div>
      <label class="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Confiance en l'atteinte</span>
        <span class="text-indigo-400">{confidence}%</span>
      </label>
      <input type="range" min="0" max="100" step="5" bind:value={confidence} class="w-full accent-indigo-500" />
    </div>
  </div>

  <!-- Key Results -->
  <div class="card space-y-3 mb-4">
    <div class="flex items-center justify-between">
      <h2 class="font-medium text-zinc-200 text-sm">Key Results</h2>
      <button class="btn btn-ghost text-xs py-1 px-2" on:click={addKR}>+ KR</button>
    </div>

    {#each krs as kr, i}
      <div class="space-y-2 border border-zinc-800 rounded-lg p-3">
        <div class="flex gap-2">
          <input bind:value={kr.title} class="input flex-1" placeholder="Mesurer l'avancement..." />
          {#if krs.length > 1}
            <button class="btn btn-ghost text-xs p-1.5" on:click={() => removeKR(i)}>✕</button>
          {/if}
        </div>
        <div class="flex gap-2">
          <select bind:value={kr.type} class="input w-32">
            <option value="numeric">Numérique</option>
            <option value="boolean">Oui/Non</option>
            <option value="milestone">Étape</option>
          </select>
          {#if kr.type === 'numeric'}
            <input bind:value={kr.target} class="input flex-1" placeholder="Cible (ex: 180)" type="number" />
            <input bind:value={kr.unit} class="input w-20" placeholder="kg / € / %" />
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="flex gap-3">
    <button class="btn btn-primary flex-1 justify-center" on:click={submit} disabled={submitting || !title.trim()}>
      {submitting ? 'Création...' : '✓ Créer l\'objectif'}
    </button>
    <a href="/objectives" class="btn btn-ghost">Annuler</a>
  </div>
</div>
