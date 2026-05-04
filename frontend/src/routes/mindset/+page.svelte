<script lang="ts">
  import { onMount } from 'svelte'
  import { pb } from '$lib/pb'

  let profile: any = null
  let loading = true

  const mbtiDescriptions: Record<string, { title: string; desc: string; strengths: string[] }> = {
    'INTJ': { title: 'Architecte', desc: 'Stratège systémique. Vision long terme. Raisonne par modèles.', strengths: ['Vision systémique', 'Indépendance', 'Stratégie'] },
    'INTP': { title: 'Logicien', desc: 'Penseur abstrait. Résout des problèmes complexes.', strengths: ['Analyse', 'Innovation', 'Logique'] },
    'ENTJ': { title: 'Commandant', desc: 'Leader naturel. Incarne la vision et mobilise.', strengths: ['Leadership', 'Efficacité', 'Ambition'] },
    'ENTP': { title: 'Innovateur', desc: 'Questionne tout. Trouve des angles impossibles.', strengths: ['Créativité', 'Débat', 'Adaptation'] },
  }

  const discDescriptions: Record<string, { title: string; desc: string; color: string }> = {
    'D': { title: 'Dominance', desc: 'Orienté résultats. Direct. Décideur rapide. Fonce.', color: '#ef4444' },
    'I': { title: 'Influence', desc: 'Communicant. Enthousiaste. Moteur de groupe.', color: '#f59e0b' },
    'S': { title: 'Stabilité', desc: 'Fiable. Patient. Force tranquille. Loyal.', color: '#10b981' },
    'C': { title: 'Conformité', desc: 'Précis. Analytique. Exigeant. Perfectionniste.', color: '#3b82f6' },
  }

  const hdTypes: Record<string, { title: string; desc: string; authority: Record<string, string> }> = {
    'Generator': {
      title: 'Générateur',
      desc: 'Énergie vitale naturelle. Construit et crée. Le travail qui nourrit l\'énergie.',
      authority: { 'Sacral': 'Réponds viscéralement (oui/non instinctif)', 'Emotional': 'Attends la clarté émotionnelle' }
    },
    'Manifesting Generator': {
      title: 'Générateur Manifestant',
      desc: 'Multi-passionné. Rapide. Doit répondre avant d\'initier.',
      authority: { 'Sacral': 'Réponds viscéralement', 'Emotional': 'Attends la clarté' }
    },
    'Projector': {
      title: 'Projecteur',
      desc: 'Guide naturel. Voit le système entier. Attend l\'invitation.',
      authority: { 'Mental': 'Consulte des personnes de confiance', 'Splenic': 'Fais confiance au premier signal' }
    },
    'Manifestor': {
      title: 'Manifestant',
      desc: 'Initiateur. Catalyseur de changement. Informe avant d\'agir.',
      authority: { 'Splenic': 'Fais confiance à l\'instinct immédiat' }
    },
  }

  onMount(async () => {
    try {
      const res = await pb.collection('onboarding_profile').getList(1, 1, { sort: '-created' })
      profile = res.items[0] || null
    } catch {}
    loading = false
  })

  $: mbtiInfo = profile?.mbti_type ? (mbtiDescriptions[profile.mbti_type] || { title: profile.mbti_type, desc: 'Profil unique', strengths: [] }) : null
  $: discInfo = profile?.disc_type ? (discDescriptions[profile.disc_type] || { title: profile.disc_type, desc: '', color: '#6366f1' }) : null
  $: hdInfo = profile?.hd_type ? hdTypes[profile.hd_type] : null
  $: authorityDesc = hdInfo && profile?.hd_authority ? (hdInfo.authority[profile.hd_authority] || 'Fais confiance à ton signal intérieur') : null
</script>

<svelte:head><title>SternOS — Mindset</title></svelte:head>

<div class="max-w-2xl mx-auto space-y-5">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold text-white">Profil Mindset</h1>
    <a href="/onboarding"
      class="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-lg transition-colors">
      ✦ Refaire le profil
    </a>
  </div>

  {#if loading}
    <div class="text-zinc-500 text-sm py-12 text-center">Chargement...</div>
  {:else if !profile}
    <div class="text-center py-16 bg-zinc-900 rounded-xl border border-zinc-800">
      <div class="text-4xl mb-4">◉</div>
      <p class="text-zinc-400 text-sm mb-4">Aucun profil mindset trouvé.</p>
      <a href="/onboarding" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
        Démarrer l'onboarding
      </a>
    </div>
  {:else}
    <!-- Header identité -->
    <div class="bg-gradient-to-r from-zinc-900 to-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div class="text-2xl font-bold text-white mb-1">{profile.mbti_type || '?'} · {discInfo?.title || '?'}</div>
      <div class="text-zinc-400 text-sm">{mbtiInfo?.desc}</div>
      {#if mbtiInfo?.strengths}
        <div class="flex gap-2 mt-3">
          {#each mbtiInfo.strengths as s}
            <span class="text-xs bg-indigo-500/15 text-indigo-300 px-2 py-1 rounded-full">{s}</span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 2-col grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- MBTI -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Type MBTI</div>
        <div class="text-2xl font-bold text-indigo-400 font-mono">{profile.mbti_type || '—'}</div>
        {#if mbtiInfo}
          <div class="text-white text-sm font-medium mt-1">{mbtiInfo.title}</div>
        {/if}
      </div>

      <!-- DISC -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Style DISC</div>
        {#if discInfo}
          <div class="text-2xl font-bold font-mono" style="color: {discInfo.color}">{profile.disc_type}</div>
          <div class="text-white text-sm font-medium mt-1">{discInfo.title}</div>
          <div class="text-zinc-500 text-xs mt-1">{discInfo.desc}</div>
        {:else}
          <div class="text-zinc-600 text-sm">Non défini</div>
        {/if}
      </div>

      <!-- Profil énergétique natal (HD) -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:col-span-2">
        <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Profil énergétique natal</div>
        {#if hdInfo}
          <div class="flex items-start gap-4">
            <div>
              <div class="text-lg font-bold text-violet-400">{hdInfo.title}</div>
              <div class="text-zinc-500 text-xs mt-0.5">{profile.hd_profile || ''}</div>
            </div>
            <div class="flex-1">
              <p class="text-zinc-300 text-sm">{hdInfo.desc}</p>
              {#if authorityDesc}
                <div class="mt-2 bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                  <div class="text-violet-400 text-xs uppercase tracking-wider mb-1">Autorité décisionnelle</div>
                  <div class="text-white text-sm">{authorityDesc}</div>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="text-zinc-600 text-sm">Données non disponibles — complète l'onboarding avec ta date de naissance</div>
        {/if}
      </div>
    </div>

    <!-- Ressources actuelles -->
    {#if profile.situation}
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">Ressources actuelles</div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-white font-bold text-lg">{profile.revenus_mensuels || 0}€</div>
            <div class="text-zinc-500 text-xs">revenu mensuel</div>
          </div>
          <div>
            <div class="text-white font-bold text-lg">{profile.heures_dispo || 0}h</div>
            <div class="text-zinc-500 text-xs">dispo/semaine</div>
          </div>
          <div>
            <div class="text-white font-bold text-lg capitalize">{profile.situation || '—'}</div>
            <div class="text-zinc-500 text-xs">situation</div>
          </div>
        </div>
        {#if profile.competences}
          {@const comps = (() => { try { return JSON.parse(profile.competences) } catch { return [] } })()}
          <div class="flex flex-wrap gap-2 mt-3">
            {#each comps as c}
              <span class="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">{c}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- P0 invariants -->
    {#if profile.p0_invariants}
      {@const p0s = (() => { try { return JSON.parse(profile.p0_invariants) } catch { return [] } })()}
      {#if p0s.length}
        <div class="bg-zinc-900 border border-violet-500/20 rounded-xl p-4">
          <div class="text-xs font-mono text-violet-400 uppercase tracking-wider mb-3">P0 — Non-négociables</div>
          <div class="space-y-2">
            {#each p0s as p0}
              {#if p0.label}
                <div class="flex items-center justify-between">
                  <div class="text-white text-sm">{p0.label}</div>
                  {#if p0.deadline}
                    <div class="text-zinc-500 text-xs">{p0.deadline}</div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>
