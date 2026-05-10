import type { CollectionConfig } from 'payload'

export const UiSchemas: CollectionConfig = {
  slug: 'ui_schemas',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'page_id', 'layout', 'version', 'active'] },
  fields: [
    { name: 'page_id', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'intent', type: 'textarea' },
    {
      name: 'layout',
      type: 'select',
      options: ['dashboard', 'list', 'detail', 'form', 'graph', 'fullscreen'].map(v => ({ label: v, value: v })),
      defaultValue: 'dashboard',
    },
    { name: 'widgets', type: 'json' },
    { name: 'version', type: 'text', defaultValue: '1.0.0' },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
