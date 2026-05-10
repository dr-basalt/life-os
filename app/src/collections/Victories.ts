import type { CollectionConfig } from 'payload'

export const Victories: CollectionConfig = {
  slug: 'victories',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'type', 'impact', 'date'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      options: ['milestone', 'habit', 'insight', 'delivery', 'relationship'].map(v => ({ label: v, value: v })),
      defaultValue: 'milestone',
    },
    {
      name: 'impact',
      type: 'select',
      options: ['small', 'medium', 'large', 'epic'].map(v => ({ label: v, value: v })),
      defaultValue: 'medium',
    },
    { name: 'date', type: 'date', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'objective', type: 'relationship', relationTo: 'objectives' },
    { name: 'key_result', type: 'relationship', relationTo: 'key_results' },
    { name: 'emoji', type: 'text' },
  ],
}
