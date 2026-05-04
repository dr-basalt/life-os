<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { pb } from '$lib/pb'

  // Config — pointe vers le runtime SOMA
  const SOMA_URL = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname.replace(/^[^.]+/, 'soma')}`
    : 'https://soma.46.224.111.203.nip.io'
  const ADMIN_TOKEN = 'SternOSAdmin2026'

  let sessionId = 'admin-' + Date.now()
  let messages: { role: 'user' | 'assistant' | 'system'; content: string; events?: any[] }[] = []
  let input = ''
  let loading = false
  let somaInfo: any = null
  let chatEl: HTMLDivElement

  // Quick commands
  const quickCmds = [
    { label: '📊 État des containers', cmd: 'Montre-moi l\'état de tous les containers Docker SternOS' },
    { label: '🧠 Contexte Neo4j', cmd: 'Récupère le contexte complet du Persona Graph dr-basalt depuis Neo4j' },
    { label: '📁 Structure projet', cmd: 'Liste la structure du projet /opt/stern-os' },
    { label: '📝 Git log', cmd: 'Montre-moi les 5 derniers commits git' },
    { label: '🔧 Santé PocketBase', cmd: 'Vérifie la santé de PocketBase et liste les collections' },
    { label: '🎯 OKRs actifs', cmd: 'Liste tous les OKRs actifs depuis PocketBase' },
  ]

  onMount(async () => {
    try {
      const res = await fetch(`${SOMA_URL}/health`)
      somaInfo = await res.json()
    } catch {
      somaInfo = { status: 'offline', agent: 'SOMA', version: '?' }
    }

    messages = [{
      role: 'system',
      content: `SOMA opérationnel — ${somaInfo?.model || 'LLM configuré'}. Modèle: ${somaInfo?.model || '?'}`
    }]
  })

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return

    input = ''
    loading = true
    messages = [...messages, { role: 'user', content: msg }]
    await tick()
    chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' })

    const assistantMsg = { role: 'assistant' as const, content: '', events: [] as any[] }
    messages = [...messages, assistantMsg]

    try {
      const res = await fetch(`${SOMA_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': ADMIN_TOKEN,
        },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      })

      if (!res.ok) {
        assistantMsg.content = `Erreur: ${res.status} — ${await res.text()}`
        messages = [...messages]
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (!data.trim()) continue

          try {
            const event = JSON.parse(data)
            if (event.type === 'text') {
              assistantMsg.content += event.content
            } else if (event.type === 'tool_call' || event.type === 'tool_result') {
              assistantMsg.events = [...(assistantMsg.events || []), event]
            } else if (event.type === 'done') {
              break
            }
            messages = [...messages]
            await tick()
            chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' })
          } catch {}
        }
      }
    } catch (e: any) {
      assistantMsg.content = `Erreur de connexion à SOMA: ${e.message}`
      messages = [...messages]
    } finally {
      loading = false
      await tick()
      chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' })
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearSession() {
    sessionId = 'admin-' + Date.now()
    messages = [{ role: 'system', content: 'Nouvelle session — SOMA réinitialisé.' }]
  }

  function formatContent(content: string): string {
    // Simple markdown: code blocks, bold
    return content
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-zinc-950 border border-zinc-700 rounded p-3 text-xs overflow-x-auto my-2 text-emerald-300"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 text-indigo-300 px-1 rounded text-xs">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\n/g, '<br>')
  }
</script>

<svelte:head><title>SternOS — SOMA Admin</title></svelte:head>

<div class="flex flex-col h-[calc(100vh-56px)]">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 rounded-full {somaInfo?.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse"></div>
      <div>
        <span class="text-white font-mono font-bold text-sm">SOMA</span>
        <span class="text-zinc-500 text-xs ml-2">SternOS Agent Runtime</span>
      </div>
      {#if somaInfo?.model}
        <span class="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">{somaInfo.model}</span>
      {/if}
    </div>
    <div class="flex gap-2">
      <button on:click={clearSession}
        class="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded px-3 py-1 transition-colors">
        ↺ Nouvelle session
      </button>
    </div>
  </div>

  <!-- Quick commands -->
  <div class="flex gap-2 px-4 py-2 border-b border-zinc-800 overflow-x-auto shrink-0">
    {#each quickCmds as cmd}
      <button on:click={() => sendMessage(cmd.cmd)}
        class="text-xs whitespace-nowrap px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full border border-zinc-700 hover:border-zinc-600 transition-colors">
        {cmd.label}
      </button>
    {/each}
  </div>

  <!-- Chat messages -->
  <div bind:this={chatEl} class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    {#each messages as msg}
      {#if msg.role === 'system'}
        <div class="text-center text-zinc-600 text-xs font-mono py-1">
          ── {msg.content} ──
        </div>

      {:else if msg.role === 'user'}
        <div class="flex justify-end">
          <div class="max-w-xl bg-indigo-600/20 border border-indigo-500/30 rounded-xl rounded-tr-sm px-4 py-3">
            <p class="text-white text-sm">{msg.content}</p>
          </div>
        </div>

      {:else if msg.role === 'assistant'}
        <div class="flex justify-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
            <span class="text-xs text-emerald-400 font-mono">S</span>
          </div>
          <div class="flex-1 max-w-2xl">
            <!-- Tool calls -->
            {#if msg.events && msg.events.length > 0}
              <div class="mb-3 space-y-1.5">
                {#each msg.events as ev}
                  {#if ev.type === 'tool_call'}
                    <div class="flex items-center gap-2 text-xs font-mono bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5">
                      <span class="text-amber-400">⚙</span>
                      <span class="text-zinc-400">{ev.name}</span>
                      {#if ev.args && Object.keys(ev.args).length}
                        <span class="text-zinc-600 truncate">{JSON.stringify(ev.args).substring(0, 60)}…</span>
                      {/if}
                    </div>
                  {:else if ev.type === 'tool_result'}
                    <div class="text-xs font-mono text-zinc-600 pl-6">
                      {#if ev.result?.error}
                        <span class="text-red-400">✗ {ev.result.error}</span>
                      {:else}
                        <span class="text-emerald-500">✓ {ev.name} ok</span>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            <!-- Response text -->
            {#if msg.content}
              <div class="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-sm px-4 py-3">
                <div class="text-zinc-200 text-sm leading-relaxed prose-sm">
                  {@html formatContent(msg.content)}
                </div>
              </div>
            {:else if loading && messages[messages.length - 1] === msg}
              <div class="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-sm px-4 py-3">
                <div class="flex gap-1 items-center">
                  <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Input -->
  <div class="px-4 py-3 border-t border-zinc-800 bg-zinc-950 shrink-0">
    <div class="flex gap-3 items-end">
      <textarea
        bind:value={input}
        on:keydown={handleKeydown}
        disabled={loading}
        placeholder="Demande à SOMA de modifier du code, vérifier l'infra, requêter Neo4j..."
        rows="2"
        class="flex-1 bg-zinc-900 border border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm resize-none focus:outline-none transition-colors disabled:opacity-50"
      ></textarea>
      <button
        on:click={() => sendMessage()}
        disabled={loading || !input.trim()}
        class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0 font-medium text-sm"
      >
        {loading ? '…' : '→'}
      </button>
    </div>
    <div class="text-zinc-700 text-xs mt-1.5 pl-1">
      Entrée pour envoyer · Maj+Entrée pour saut de ligne · Session: <span class="font-mono">{sessionId.slice(-8)}</span>
    </div>
  </div>
</div>
