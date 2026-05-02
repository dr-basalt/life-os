<script lang="ts">
  import { pb } from '$lib/pb'
  import { goto } from '$app/navigation'

  let email = ''
  let password = ''
  let error = ''
  let loading = false

  async function login() {
    error = ''
    loading = true
    try {
      await pb.admins.authWithPassword(email, password)
      goto('/')
    } catch {
      try {
        await pb.collection('users').authWithPassword(email, password)
        goto('/')
      } catch {
        error = 'Email ou mot de passe incorrect'
      }
    } finally {
      loading = false
    }
  }
</script>

<svelte:head><title>Life OS — Connexion</title></svelte:head>

<div class="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="text-4xl mb-3">◈</div>
      <h1 class="text-2xl font-bold text-white">Life OS</h1>
      <p class="text-zinc-500 text-sm mt-1">Ton cockpit de vie</p>
    </div>

    <div class="card space-y-4">
      {#if error}
        <div class="bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      {/if}

      <div>
        <label class="block text-xs text-zinc-400 mb-1.5">Email</label>
        <input
          bind:value={email}
          type="email"
          class="input"
          placeholder="admin@example.com"
          on:keydown={e => e.key === 'Enter' && login()}
        />
      </div>

      <div>
        <label class="block text-xs text-zinc-400 mb-1.5">Mot de passe</label>
        <input
          bind:value={password}
          type="password"
          class="input"
          placeholder="••••••••"
          on:keydown={e => e.key === 'Enter' && login()}
        />
      </div>

      <button class="btn btn-primary w-full justify-center" on:click={login} disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </div>
  </div>
</div>
