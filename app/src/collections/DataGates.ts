import type { CollectionConfig } from 'payload'

export const DataGates: CollectionConfig = {
  slug: 'data_gates',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'type', 'status', 'last_sync'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      options: ['api', 'git', 'obsidian', 'syncthing', 'server', 'saas', 'rss', 'webhook'].map(v => ({ label: v, value: v })),
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: ['active', 'paused', 'error', 'pending'].map(v => ({ label: v, value: v })),
      defaultValue: 'pending',
    },
    { name: 'url', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'last_sync', type: 'date' },
    { name: 'sync_interval_minutes', type: 'number' },
    { name: 'config', type: 'json' },
    { name: 'error_message', type: 'text' },
  ],
}
