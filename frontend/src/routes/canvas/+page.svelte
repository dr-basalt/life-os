<script lang="ts">
  import { onMount } from 'svelte'
  import { pb } from '$lib/pb'
  import type { Objective, KeyResult } from '$lib/types'

  let objectives: Objective[] = []
  let keyResults: KeyResult[] = []
  let loading = true
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D | null
  let view = 'graph' // 'graph' | 'tree'
  let selectedNode: any = null

  const domainColors: Record<string, string> = {
    'business': '#8b5cf6',
    'life':     '#3b82f6',
    'health':   '#10b981',
    'product':  '#f59e0b',
    'learning': '#ec4899',
  }

  type GraphNode = {
    id: string; label: string; x: number; y: number;
    r: number; color: string; type: 'okr' | 'kr';
    data: any;
  }

  let nodes: GraphNode[] = []
  let edges: { from: string; to: string }[] = []

  onMount(async () => {
    try {
      objectives = await pb.collection('objectives').getFullList<Objective>({ filter: 'status != "abandoned"' })
      keyResults = await pb.collection('key_results').getFullList<KeyResult>()
    } catch {}
    loading = false
    buildGraph()
  })

  function buildGraph() {
    nodes = []
    edges = []
    const cx = 600, cy = 300
    const R = 220

    objectives.forEach((obj, i) => {
      const angle = (i / Math.max(objectives.length, 1)) * Math.PI * 2 - Math.PI / 2
      const x = cx + R * Math.cos(angle)
      const y = cy + R * Math.sin(angle)
      nodes.push({
        id: obj.id, label: (obj.emoji || '◎') + ' ' + obj.title.substring(0, 28),
        x, y, r: 38, color: domainColors[obj.type] || '#6366f1',
        type: 'okr', data: obj
      })

      const krs = keyResults.filter(kr => kr.objective === obj.id)
      krs.forEach((kr, j) => {
        const krAngle = angle + ((j - krs.length / 2 + 0.5) * 0.3)
        const krR = R + 110
        const kx = cx + krR * Math.cos(krAngle)
        const ky = cy + krR * Math.sin(krAngle)
        nodes.push({
          id: kr.id, label: kr.title.substring(0, 24),
          x: kx, y: ky, r: 24, color: (domainColors[obj.type] || '#6366f1') + '80',
          type: 'kr', data: kr
        })
        edges.push({ from: obj.id, to: kr.id })
      })
    })
  }

  // SVG-based canvas (simpler than Canvas API)
  $: svgNodes = nodes
  $: svgEdges = edges.map(e => ({
    from: nodes.find(n => n.id === e.from),
    to: nodes.find(n => n.id === e.to),
  })).filter(e => e.from && e.to)

  function getProgress(obj: Objective): number {
    const krs = keyResults.filter(kr => kr.objective === obj.id)
    if (!krs.length) return 0
    const done = krs.filter(kr => kr.status === 'completed').length
    return Math.round((done / krs.length) * 100)
  }
</script>

<svelte:head><title>SternOS — Canvas</title></svelte:head>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold text-white">Canvas</h1>
    <div class="flex gap-2">
      <button on:click={() => view = 'graph'}
        class="px-3 py-1.5 text-xs rounded-lg transition-colors {view === 'graph' ? 'bg-indigo-600 text-white' : 'border border-zinc-700 text-zinc-400 hover:text-white'}">
        Graphe
      </button>
      <button on:click={() => view = 'tree'}
        class="px-3 py-1.5 text-xs rounded-lg transition-colors {view === 'tree' ? 'bg-indigo-600 text-white' : 'border border-zinc-700 text-zinc-400 hover:text-white'}">
        Arbre
      </button>
    </div>
  </div>

  {#if loading}
    <div class="text-zinc-500 text-sm py-12 text-center">Chargement...</div>
  {:else if objectives.length === 0}
    <div class="text-center py-16 text-zinc-600">
      <div class="text-4xl mb-3">◌</div>
      <p class="text-sm">Aucun OKR. <a href="/onboarding" class="text-indigo-400 underline">Démarre l'onboarding</a></p>
    </div>
  {:else}
    {#if view === 'graph'}
      <!-- SVG Force Graph -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden" style="height: 600px;">
        <svg width="100%" height="100%" viewBox="0 0 1200 600" class="w-full h-full">
          <!-- Background grid -->
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="1200" height="600" fill="url(#grid)" />

          <!-- Edges -->
          {#each svgEdges as edge}
            {#if edge.from && edge.to}
              <line x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y}
                stroke={edge.from.color} stroke-width="1.5" stroke-opacity="0.3" />
            {/if}
          {/each}

          <!-- Nodes -->
          {#each svgNodes as node}
            <g class="cursor-pointer" on:click={() => selectedNode = node.data}>
              <!-- Outer ring -->
              <circle cx={node.x} cy={node.y} r={node.r + 4} fill="none"
                stroke={node.color} stroke-width="1" stroke-opacity="0.3" />
              <!-- Node circle -->
              <circle cx={node.x} cy={node.y} r={node.r}
                fill={node.color + (node.type === 'okr' ? '25' : '15')}
                stroke={node.color} stroke-width={node.type === 'okr' ? 2 : 1} />
              <!-- Label -->
              <foreignObject x={node.x - 50} y={node.y + node.r + 4} width="100" height="30">
                <div style="color: #a1a1aa; font-size: 9px; text-align: center; font-family: monospace; line-height: 1.2;">
                  {node.label.substring(0, 20)}
                </div>
              </foreignObject>
              <!-- Inner icon for OKR -->
              {#if node.type === 'okr'}
                <text x={node.x} y={node.y + 5} text-anchor="middle" font-size="18" style="fill: {node.color}">
                  {node.data.emoji || '◎'}
                </text>
              {:else}
                <!-- KR progress arc -->
                <text x={node.x} y={node.y + 4} text-anchor="middle" font-size="9" fill="#a1a1aa">
                  {node.data.current_value || 0}/{node.data.target_value || 0}
                </text>
              {/if}
            </g>
          {/each}
        </svg>
      </div>
    {:else}
      <!-- Tree view -->
      <div class="space-y-3">
        {#each objectives as obj}
          {@const krs = keyResults.filter(kr => kr.objective === obj.id)}
          {@const color = domainColors[obj.type] || '#6366f1'}
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4" style="border-left: 3px solid {color}">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">{obj.emoji || '◎'}</span>
                <div>
                  <div class="text-white font-medium text-sm">{obj.title}</div>
                  <div class="text-zinc-500 text-xs">{obj.type} · {getProgress(obj)}% KRs complétés</div>
                </div>
              </div>
              <div class="text-xs font-mono" style="color: {color}">{obj.confidence || 0}%</div>
            </div>

            <!-- KR list -->
            {#if krs.length > 0}
              <div class="ml-8 space-y-2">
                {#each krs as kr}
                  <div class="flex items-center gap-3">
                    <div class="w-1 h-1 rounded-full bg-zinc-600"></div>
                    <div class="flex-1">
                      <div class="text-zinc-300 text-xs">{kr.title}</div>
                    </div>
                    <div class="text-zinc-500 text-xs font-mono">
                      {kr.current_value || 0}/{kr.target_value || 0} {kr.unit || ''}
                    </div>
                    <div class="w-16 bg-zinc-800 rounded-full h-1">
                      <div class="h-1 rounded-full transition-all" style="width: {kr.target_value ? Math.min(100, Math.round(((kr.current_value||0)/(kr.target_value))*100)) : 0}%; background: {color}"></div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="ml-8 text-zinc-600 text-xs">Aucun KR défini</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Selected node detail -->
    {#if selectedNode}
      <div class="bg-zinc-900 border border-indigo-500/30 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-white font-medium text-sm">{selectedNode.emoji || ''} {selectedNode.title || selectedNode.title}</div>
          <button on:click={() => selectedNode = null} class="text-zinc-500 hover:text-white">×</button>
        </div>
        {#if selectedNode.description}
          <p class="text-zinc-400 text-sm">{selectedNode.description}</p>
        {/if}
        {#if selectedNode.deadline}
          <div class="text-zinc-500 text-xs mt-2">Deadline: {selectedNode.deadline}</div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
