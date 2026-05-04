<script lang="ts">
  import { onMount } from 'svelte'
  import { pb } from '$lib/pb'
  import type { Task, Project } from '$lib/types'

  let tasks: Task[] = []
  let projects: Project[] = []
  let loading = true
  let showModal = false
  let filterDomain = 'all'
  let draggedTask: Task | null = null

  const columns = [
    { id: 'todo',        label: 'À faire',    icon: '📋', color: 'zinc' },
    { id: 'in_progress', label: 'En cours',   icon: '⚡', color: 'indigo' },
    { id: 'waiting',     label: 'En attente', icon: '⏸', color: 'amber' },
    { id: 'done',        label: 'Terminé',    icon: '✅', color: 'emerald' },
  ]

  const domainColors: Record<string, string> = {
    'business': 'bg-violet-500/20 text-violet-300',
    'health':   'bg-emerald-500/20 text-emerald-300',
    'life':     'bg-blue-500/20 text-blue-300',
    'product':  'bg-orange-500/20 text-orange-300',
    'learning': 'bg-pink-500/20 text-pink-300',
  }

  // New task form
  let newTask = { title: '', project: '', status: 'todo', priority: 1, due_date: '', notes: '', tags: [] as string[] }

  onMount(async () => {
    try {
      tasks = await pb.collection('tasks').getFullList<Task>({ sort: '-created' })
      projects = await pb.collection('projects').getFullList<Project>({ sort: 'title' }).catch(() => [])
    } catch (e) { /* graceful */ }
    loading = false
  })

  function getColumnTasks(colId: string) {
    return tasks.filter(t => t.status === colId)
  }

  function onDragStart(task: Task) {
    draggedTask = task
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
  }

  async function onDrop(e: DragEvent, colId: string) {
    e.preventDefault()
    if (!draggedTask || draggedTask.status === colId) return
    try {
      await pb.collection('tasks').update(draggedTask.id, { status: colId })
      tasks = tasks.map(t => t.id === draggedTask!.id ? { ...t, status: colId as any } : t)
    } catch {}
    draggedTask = null
  }

  async function createTask() {
    if (!newTask.title.trim()) return
    try {
      const created = await pb.collection('tasks').create(newTask)
      tasks = [created as Task, ...tasks]
      newTask = { title: '', project: '', status: 'todo', priority: 1, due_date: '', notes: '', tags: [] }
      showModal = false
    } catch (e: any) {
      console.error(e)
    }
  }

  async function deleteTask(id: string) {
    try {
      await pb.collection('tasks').delete(id)
      tasks = tasks.filter(t => t.id !== id)
    } catch {}
  }

  function priorityDot(p?: number) {
    if (!p || p <= 1) return 'bg-zinc-600'
    if (p === 2) return 'bg-amber-500'
    return 'bg-red-500'
  }
</script>

<svelte:head><title>SternOS — Board</title></svelte:head>

<div class="space-y-4">
  <!-- Toolbar -->
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold text-white">Board</h1>
    <button on:click={() => showModal = true}
      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors font-medium">
      + Nouvelle tâche
    </button>
  </div>

  {#if loading}
    <div class="text-zinc-500 text-sm py-12 text-center">Chargement...</div>
  {:else}
    <!-- Kanban board -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each columns as col}
        <div
          on:dragover={onDragOver}
          on:drop={(e) => onDrop(e, col.id)}
          class="bg-zinc-900 rounded-xl border border-zinc-800 min-h-[400px]">
          <!-- Column header -->
          <div class="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm">{col.icon}</span>
              <span class="text-white font-medium text-sm">{col.label}</span>
            </div>
            <span class="text-zinc-600 text-xs bg-zinc-800 rounded-full px-2 py-0.5">
              {getColumnTasks(col.id).length}
            </span>
          </div>

          <!-- Cards -->
          <div class="p-2 space-y-2">
            {#each getColumnTasks(col.id) as task}
              <div
                draggable="true"
                on:dragstart={() => onDragStart(task)}
                class="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 rounded-lg p-3 cursor-grab active:cursor-grabbing group transition-all">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                      <div class="w-1.5 h-1.5 rounded-full {priorityDot(task.priority)} shrink-0"></div>
                      <span class="text-white text-sm font-medium truncate">{task.title}</span>
                    </div>
                    {#if task.due_date}
                      <div class="text-zinc-500 text-xs">{new Date(task.due_date).toLocaleDateString('fr-FR')}</div>
                    {/if}
                    {#if task.notes}
                      <div class="text-zinc-600 text-xs mt-1 truncate">{task.notes}</div>
                    {/if}
                  </div>
                  <button on:click={() => deleteTask(task.id)}
                    class="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-all">
                    ×
                  </button>
                </div>
              </div>
            {/each}

            {#if getColumnTasks(col.id).length === 0}
              <div class="text-zinc-700 text-xs text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                Dépose ici
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Create task modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-white font-semibold">Nouvelle tâche</h2>
        <button on:click={() => showModal = false} class="text-zinc-500 hover:text-white text-xl">×</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Titre</label>
          <input bind:value={newTask.title} type="text" placeholder="Qu'est-ce que tu dois faire ?"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-zinc-400 text-xs uppercase tracking-wider">Statut</label>
            <select bind:value={newTask.status}
              class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm">
              {#each columns as col}
                <option value={col.id}>{col.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="text-zinc-400 text-xs uppercase tracking-wider">Priorité</label>
            <select bind:value={newTask.priority}
              class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm">
              <option value={1}>Normale</option>
              <option value={2}>Haute</option>
              <option value={3}>Critique</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Deadline</label>
          <input bind:value={newTask.due_date} type="date"
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm" />
        </div>

        <div>
          <label class="text-zinc-400 text-xs uppercase tracking-wider">Notes</label>
          <textarea bind:value={newTask.notes} rows="2" placeholder="Contexte, liens, notes..."
            class="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-5">
        <button on:click={() => showModal = false}
          class="flex-1 py-2 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-sm transition-colors">
          Annuler
        </button>
        <button on:click={createTask}
          class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
          Créer
        </button>
      </div>
    </div>
  </div>
{/if}
