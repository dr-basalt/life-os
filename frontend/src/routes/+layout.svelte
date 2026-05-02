<script lang="ts">
  import '../app.css'
  import NavBar from '$lib/components/NavBar.svelte'
  import { onMount } from 'svelte'
  import { pb } from '$lib/pb'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  const PUBLIC_ROUTES = ['/login']

  onMount(() => {
    // Vérifier l'auth — redirect si non connecté
    if (!PUBLIC_ROUTES.includes($page.url.pathname) && !pb.authStore.isValid) {
      goto('/login')
    }
  })
</script>

{#if pb.authStore.isValid || PUBLIC_ROUTES.includes($page?.url?.pathname ?? '')}
  <NavBar />
  <main class="max-w-6xl mx-auto px-4 py-6">
    <slot />
  </main>
{:else}
  <slot />
{/if}
