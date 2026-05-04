<script lang="ts">
  import { pb } from '$lib/pb'
  import { goto } from '$app/navigation'

  let step = 1
  const totalSteps = 5
  let loading = false
  let roadmap: any = null
  let error = ''

  // Step 1 — Mindset
  const mbtiQuestions = [
    { id: 'EI', q: 'Tu recharges ton énergie...', a: 'Seul(e), dans le calme', b: 'Entouré(e) de gens' },
    { id: 'SN', q: 'Tu fais plus confiance à...', a: 'Tes 5 sens et les faits concrets', b: 'Ton intuition et les patterns' },
    { id: 'TF', q: 'Tu décides avec...', a: 'Ta tête et la logique', b: 'Ton cœur et les valeurs' },
    { id: 'JP', q: 'Tu préfères...', a: 'Un plan clair et structuré', b: 'Rester flexible et t\'adapter' },
    { id: 'EI2', q: 'En réunion, tu...', a: 'Préfères écouter et réfléchir avant de parler', b: 'Parles naturellement et penses à voix haute' },
    { id: 'SN2', q: 'Quand tu apprends quelque chose...', a: 'Tu veux les détails pratiques', b: 'Tu veux comprendre le concept global' },
    { id: 'TF2', q: 'Face à un désaccord...', a: 'Tu cherches la meilleure solution logique', b: 'Tu cherches un terrain d\'entente humain' },
    { id: 'JP2', q: 'Ton bureau / espace de travail...', a: 'Est organisé, chaque chose à sa place', b: 'Est créatif — un peu de chaos inspirant' },
  ]

  const discQuestions = [
    { id: 'D', q: 'Quand tu veux un résultat...', a: 'Tu fonces et prends les décisions vite', other: 'Tu analyses d\'abord ou tu consultes' },
    { id: 'I', q: 'Dans un groupe...', a: 'Tu motives et entraînes les autres naturellement', other: 'Tu préfères opérer en coulisse' },
    { id: 'S', q: 'Face au changement...', a: 'Tu te sens bien dans la stabilité et la routine', other: 'Tu t\'adaptes et cherches la nouveauté' },
    { id: 'C', q: 'Quand tu fais quelque chose...', a: 'Tu veux que ce soit parfait et selon les règles', other: 'Tu veux que ce soit fait, perfectible ensuite' },
  ]

  let mbtiAnswers: Record<string, 'a' | 'b'> = {}
  let discAnswers: Record<string, 'a' | 'b'> = {}
  let prenom = ''
  let birthDate = ''
  let birthTime = ''

  function getMbtiType(): string {
    const ei = Object.entries(mbtiAnswers).filter(([k]) => k.startsWith('EI'))
    const sn = Object.entries(mbtiAnswers).filter(([k]) => k.startsWith('SN'))
    const tf = Object.entries(mbtiAnswers).filter(([k]) => k.startsWith('TF'))
    const jp = Object.entries(mbtiAnswers).filter(([k]) => k.startsWith('JP'))
    const score = (arr: [string, string][], letter: string) =>
      arr.filter(([, v]) => v === 'a').length >= arr.length / 2 ? letter[0] : letter[1]
    return score(ei, 'EI') + score(sn, 'SN') + score(tf, 'TF') + score(jp, 'JP')
  }

  function getDiscType(): string {
    const dominant = Object.entries(discAnswers).filter(([, v]) => v === 'a').map(([k]) => k)
    return dominant.length > 0 ? dominant[0] : 'I'
  }

  // Step 2 — Ressources
  let revenus = 0
  let heures = 10
  let situation = 'salarié'
  let competences: string[] = []
  let competenceInput = ''

  function addCompetence() {
    if (competenceInput.trim() && competences.length < 7) {
      competences = [...competences, competenceInput.trim()]
      competenceInput = ''
    }
  }

  function removeCompetence(i: number) {
    competences = competences.filter((_, idx) => idx !== i)
  }

  // Step 3 — Rêve
  let revePro = ''
  let mission = ''
  const allDomaines = ['Business & Finance', 'Corps & Santé', 'Amour & Relations', 'Transmission & Impact', 'Liberté & Voyage']
  let selectedDomaines: string[] = []

  // Step 4 — P0
  let p0s = [{ label: '', deadline: '' }, { label: '', deadline: '' }]
  let nonVouloir = ''

  function addP0() { if (p0s.length < 5) p0s = [...p0s, { label: '', deadline: '' }] }
  function removeP0(i: number) { if (p0s.length > 1) p0s = p0s.filter((_, idx) => idx !== i) }

  // Step 5 — Génération
  async function generateRoadmap() {
    loading = true
    error = ''
    try {
      const profile = {
        prenom,
        mbtiType: getMbtiType(),
        discType: getDiscType(),
        situation,
        revenus,
        heures,
        competences,
        revePro,
        mission,
        domaines: selectedDomaines,
        p0: p0s.filter(p => p.label),
        nonVouloir,
        birthDate,
        birthTime,
      }

      const res = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!res.ok) throw new Error('Génération échouée')
      roadmap = await res.json()
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  async function saveAndGo() {
    if (!roadmap) return
    loading = true
    try {
      // Save onboarding profile
      await pb.collection('onboarding_profile').create({
        mbti_type: getMbtiType(),
        disc_type: getDiscType(),
        birth_date: birthDate,
        birth_time: birthTime,
        situation,
        revenus_mensuels: revenus,
        heures_dispo: heures,
        competences: JSON.stringify(competences),
        reve_pro: revePro,
        mission,
        domaines_prioritaires: JSON.stringify(selectedDomaines),
        p0_invariants: JSON.stringify(p0s.filter(p => p.label)),
        non_vouloir: nonVouloir,
        completed: true,
      }).catch(() => {}) // ignore if collection doesn't exist yet

      // Save OKRs
      for (const okr of roadmap.okrs || []) {
        const obj = await pb.collection('objectives').create({
          title: okr.titre,
          description: okr.description,
          type: 'life',
          status: 'active',
          deadline: okr.deadline,
          confidence: okr.confidence,
          emoji: okr.emoji,
        })
        for (const kr of okr.key_results || []) {
          await pb.collection('key_results').create({
            objective: obj.id,
            title: kr.titre,
            type: 'numeric',
            unit: kr.unite,
            target_value: kr.valeur_cible,
            current_value: 0,
            status: 'on_track',
            due_date: kr.deadline,
          }).catch(() => {})
        }
      }
      goto('/')
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  $: progress = Math.round((step / totalSteps) * 100)
  $: canNext = (() => {
    if (step === 1) return prenom.length > 0
    if (step === 2) return competences.length > 0
    if (step === 3) return revePro.length >= 50 && selectedDomaines.length > 0
    if (step === 4) return p0s.some(p => p.label)
    return true
  })()
</script>

<svelte:head><title>SternOS — Onboarding</title></svelte:head>

<div class="min-h-screen bg-zinc-950 py-8 px-4">
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="text-indigo-400 text-xs font-mono tracking-widest mb-2">STERN OS — INITIALISATION</div>
      <h1 class="text-2xl font-bold text-white">Construis ton cockpit de vie</h1>
      <p class="text-zinc-500 text-sm mt-1">Étape {step} sur {totalSteps}</p>
    </div>

    <!-- Progress bar -->
    <div class="w-full bg-zinc-800 rounded-full h-1 mb-8">
      <div class="bg-indigo-500 h-1 rounded-full transition-all duration-500" style="width: {progress}%"></div>
    </div>

    <!-- Steps -->
    <div class="bg-zinc-900 rounded-xl border border-zinc-800 p-6">

      <!-- ══ STEP 1: Mindset ══ -->
      {#if step === 1}
        <h2 class="text-lg font-semibold text-white mb-1">Profil Mindset</h2>
        <p class="text-zinc-500 text-sm mb-6">Comprendre comment tu fonctionnes naturellement</p>

        <div class="mb-4">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Ton prénom</label>
          <input bind:value={prenom} type="text" placeholder="Comment tu t'appelles ?"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
        </div>

        <div class="text-zinc-400 text-xs uppercase tracking-wider mb-3 mt-5">Questions de personnalité</div>
        {#each mbtiQuestions as q}
          <div class="mb-3">
            <div class="text-zinc-300 text-sm mb-1.5">{q.q}</div>
            <div class="flex gap-2">
              <button on:click={() => mbtiAnswers[q.id] = 'a'}
                class="flex-1 text-xs px-3 py-2 rounded-lg border transition-colors
                  {mbtiAnswers[q.id] === 'a' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}">
                {q.a}
              </button>
              <button on:click={() => mbtiAnswers[q.id] = 'b'}
                class="flex-1 text-xs px-3 py-2 rounded-lg border transition-colors
                  {mbtiAnswers[q.id] === 'b' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}">
                {q.b}
              </button>
            </div>
          </div>
        {/each}

        <div class="text-zinc-400 text-xs uppercase tracking-wider mb-3 mt-5">Style d'action</div>
        {#each discQuestions as q}
          <div class="mb-3">
            <div class="text-zinc-300 text-sm mb-1.5">{q.q}</div>
            <div class="flex gap-2">
              <button on:click={() => discAnswers[q.id] = 'a'}
                class="flex-1 text-xs px-3 py-2 rounded-lg border transition-colors
                  {discAnswers[q.id] === 'a' ? 'bg-violet-500/20 border-violet-500 text-violet-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}">
                {q.a}
              </button>
              <button on:click={() => discAnswers[q.id] = 'b'}
                class="flex-1 text-xs px-3 py-2 rounded-lg border transition-colors
                  {discAnswers[q.id] === 'b' ? 'bg-violet-500/20 border-violet-500 text-violet-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}">
                {q.other}
              </button>
            </div>
          </div>
        {/each}

        <div class="text-zinc-400 text-xs uppercase tracking-wider mb-3 mt-5">Profil énergétique natal</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-zinc-500 text-xs">Date de naissance</label>
            <input bind:value={birthDate} type="date"
              class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label class="text-zinc-500 text-xs">Heure de naissance (si connue)</label>
            <input bind:value={birthTime} type="time"
              class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

      <!-- ══ STEP 2: Ressources ══ -->
      {:else if step === 2}
        <h2 class="text-lg font-semibold text-white mb-1">Tes ressources actuelles</h2>
        <p class="text-zinc-500 text-sm mb-6">Point de départ honnête — pas de filtre</p>

        <div class="mb-5">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Situation actuelle</label>
          <select bind:value={situation}
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
            <option value="salarié">Salarié</option>
            <option value="freelance">Freelance</option>
            <option value="entrepreneur">Entrepreneur</option>
            <option value="en transition">En transition</option>
            <option value="chômage">Entre deux missions</option>
          </select>
        </div>

        <div class="mb-5">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Revenus mensuels nets (€)</label>
          <input bind:value={revenus} type="number" min="0" placeholder="ex: 3500"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
        </div>

        <div class="mb-5">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Heures dispo/semaine pour tes projets</label>
          <div class="flex items-center gap-4 mt-2">
            <input bind:value={heures} type="range" min="1" max="40"
              class="flex-1 accent-indigo-500" />
            <span class="text-indigo-400 font-mono w-12 text-right">{heures}h</span>
          </div>
        </div>

        <div class="mb-2">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Tes compétences clés (3 à 7)</label>
          <div class="flex gap-2 mt-2">
            <input bind:value={competenceInput} on:keydown={(e) => e.key === 'Enter' && addCompetence()}
              type="text" placeholder="ex: SvelteKit, négociation, copywriting..."
              class="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm" />
            <button on:click={addCompetence} class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm transition-colors">+</button>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            {#each competences as c, i}
              <span class="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-300 text-xs px-3 py-1 rounded-full">
                {c}
                <button on:click={() => removeCompetence(i)} class="text-indigo-400 hover:text-red-400 ml-1">×</button>
              </span>
            {/each}
          </div>
        </div>

      <!-- ══ STEP 3: Rêve ══ -->
      {:else if step === 3}
        <h2 class="text-lg font-semibold text-white mb-1">Ton rêve pro de ouf</h2>
        <p class="text-zinc-500 text-sm mb-6">Sans filtre. Comme si c'était possible.</p>

        <div class="mb-5">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Dans 5 ans, ta vie pro ressemble à quoi ?</label>
          <textarea bind:value={revePro} rows="4" placeholder="Je vis à... Je gagne... Je travaille sur... Les gens qui me connaissent disent que..."
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"></textarea>
          <div class="text-right text-xs mt-1 {revePro.length < 50 ? 'text-red-400' : 'text-zinc-600'}">{revePro.length}/50 min</div>
        </div>

        <div class="mb-5">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Ta mission — Pourquoi tu fais ça ?</label>
          <textarea bind:value={mission} rows="3" placeholder="Je suis ici pour... Ma raison d'être c'est..."
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"></textarea>
        </div>

        <div>
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Domaines de vie prioritaires</label>
          <div class="grid grid-cols-2 gap-2 mt-2">
            {#each allDomaines as d}
              <button on:click={() => selectedDomaines.includes(d)
                  ? (selectedDomaines = selectedDomaines.filter(x => x !== d))
                  : (selectedDomaines = [...selectedDomaines, d])}
                class="text-sm px-3 py-2.5 rounded-lg border text-left transition-colors
                  {selectedDomaines.includes(d)
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}">
                {d}
              </button>
            {/each}
          </div>
        </div>

      <!-- ══ STEP 4: P0 Invariants ══ -->
      {:else if step === 4}
        <h2 class="text-lg font-semibold text-white mb-1">Tableau des rêves — P0</h2>
        <p class="text-zinc-500 text-sm mb-1">Les non-négociables gravés dans le marbre.</p>
        <p class="text-indigo-400/70 text-xs font-mono mb-6">Ce sont tes invariants fondamentaux. L'IA ne pourra pas les modifier.</p>

        {#each p0s as p0, i}
          <div class="flex gap-2 mb-3">
            <div class="flex-1">
              <input bind:value={p0.label} type="text" placeholder={`P0 ${i+1} — ex: "200k€ en revenus automatisés avant 01/01/2027"`}
                class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 text-sm" />
            </div>
            <input bind:value={p0.deadline} type="date"
              class="w-36 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 text-sm" />
            {#if p0s.length > 1}
              <button on:click={() => removeP0(i)} class="text-zinc-600 hover:text-red-400 px-2 transition-colors">×</button>
            {/if}
          </div>
        {/each}

        {#if p0s.length < 5}
          <button on:click={addP0} class="text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 w-full transition-colors mt-1">
            + Ajouter un P0
          </button>
        {/if}

        <div class="mt-5">
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Ce que tu ne veux PLUS jamais vivre</label>
          <textarea bind:value={nonVouloir} rows="3" placeholder="Je refuse catégoriquement de... Je ne veux plus jamais..."
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 text-sm resize-none"></textarea>
        </div>

      <!-- ══ STEP 5: Génération ══ -->
      {:else if step === 5}
        <h2 class="text-lg font-semibold text-white mb-1">Génération de ta roadmap</h2>
        <p class="text-zinc-500 text-sm mb-6">L'IA analyse ton profil complet et génère ta feuille de route</p>

        {#if !roadmap && !loading}
          <div class="text-center py-8">
            <div class="text-5xl mb-4">🧠</div>
            <p class="text-zinc-400 text-sm mb-6">Prêt à générer tes OKRs personnalisés basés sur ton profil, tes P0 et ton rêve ?</p>
            <button on:click={generateRoadmap}
              class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20">
              🚀 Générer ma roadmap
            </button>
          </div>
        {/if}

        {#if loading}
          <div class="text-center py-12">
            <div class="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-zinc-400 text-sm">Analyse du profil en cours...</p>
            <p class="text-zinc-600 text-xs mt-1">Génération des OKRs personnalisés...</p>
          </div>
        {/if}

        {#if error}
          <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p class="text-red-400 text-sm">{error}</p>
            <button on:click={generateRoadmap} class="text-xs text-red-400 underline mt-2">Réessayer</button>
          </div>
        {/if}

        {#if roadmap}
          <!-- Insight clé -->
          <div class="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-5">
            <div class="text-indigo-400 text-xs font-mono uppercase tracking-wider mb-1">Insight clé</div>
            <p class="text-white text-sm font-medium">{roadmap.insight_cle}</p>
          </div>

          <!-- Premier pas -->
          <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-5">
            <div class="text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">Action cette semaine</div>
            <p class="text-white text-sm">{roadmap.premier_pas}</p>
          </div>

          <!-- OKRs générés -->
          <div class="space-y-3 mb-6">
            {#each roadmap.okrs || [] as okr}
              <div class="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{okr.emoji}</span>
                  <div class="flex-1">
                    <div class="text-white font-medium text-sm">{okr.titre}</div>
                    <div class="text-zinc-500 text-xs mt-0.5">{okr.domaine} · {okr.deadline} · {okr.confidence}% confiance</div>
                    <div class="mt-2 space-y-1">
                      {#each okr.key_results || [] as kr}
                        <div class="text-zinc-400 text-xs flex items-center gap-1">
                          <span class="text-indigo-400">◇</span>
                          {kr.titre} — {kr.valeur_cible} {kr.unite}
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <button on:click={saveAndGo} disabled={loading}
            class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Sauvegarde...' : '✅ Sauvegarder et accéder à mon dashboard'}
          </button>
        {/if}
      {/if}
    </div>

    <!-- Navigation buttons -->
    <div class="flex justify-between mt-5">
      <button on:click={() => step > 1 && step--} disabled={step === 1}
        class="px-5 py-2 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg text-sm transition-colors disabled:opacity-30">
        ← Précédent
      </button>
      {#if step < totalSteps}
        <button on:click={() => step++} disabled={!canNext}
          class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-30">
          Suivant →
        </button>
      {/if}
    </div>
  </div>
</div>
