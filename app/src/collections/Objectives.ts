import type { CollectionConfig } from 'payload'

export const Objectives: CollectionConfig = {
  slug: 'objectives',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'okr_cycle', 'deadline'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'type',
      type: 'select',
      options: ['life', 'business', 'health', 'product', 'learning'].map(v => ({ label: v, value: v })),
      defaultValue: 'business',
    },
    {
      name: 'status',
      type: 'select',
      options: ['active', 'completed', 'paused', 'abandoned'].map(v => ({ label: v, value: v })),
      defaultValue: 'active',
    },
    { name: 'okr_cycle', type: 'text' },
    { name: 'deadline', type: 'date' },
    { name: 'confidence', type: 'number', min: 0, max: 100 },
    { name: 'emoji', type: 'text' },
    {
      name: 'key_results',
      type: 'join',
      collection: 'key_results',
      on: 'objective',
    },
  ],
}
