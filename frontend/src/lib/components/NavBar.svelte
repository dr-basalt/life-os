<script lang="ts">
  import { page } from '$app/stores'

  const links = [
    { href: '/',           label: 'Dashboard', icon: '⬡' },
    { href: '/objectives', label: 'OKRs',      icon: '◎' },
    { href: '/victories',  label: 'Victoires', icon: '⚡' },
    { href: '/metrics',    label: 'Métriques', icon: '◈' },
    { href: '/agents',     label: 'Agents',    icon: '⬟' },
  ]
</script>

<nav class="h-14 border-b border-zinc-800 flex items-center px-4 gap-6 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
  <!-- Logo -->
  <a href="/" class="flex items-center gap-2 font-bold text-white shrink-0">
    <span class="text-indigo-400 text-xl">◈</span>
    <span class="hidden sm:block text-sm">Stern OS</span>
  </a>

  <div class="flex-1" />

  <!-- Nav links -->
  <div class="flex items-center gap-1">
    {#each links as link}
      <a
        href={link.href}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors
          {$page.url.pathname === link.href
            ? 'bg-indigo-500/15 text-indigo-400'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}"
      >
        <span class="text-xs">{link.icon}</span>
        <span class="hidden sm:block">{link.label}</span>
      </a>
    {/each}
  </div>
</nav>
