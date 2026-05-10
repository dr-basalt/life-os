import type { CollectionConfig } from 'payload'

export const KeyResults: CollectionConfig = {
  slug: 'key_results',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'current_value', 'target_value', 'objective'],
  },
  fields: [
    {
      name: 'objective',
      type: 'relationship',
      relationTo: 'objectives',
      required: true,
    },
    { name: 'title', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      options: ['numeric', 'boolean', 'milestone'].map(v => ({ label: v, value: v })),
      defaultValue: 'numeric',
    },
    { name: 'unit', type: 'text' },
    { name: 'current_value', type: 'number' },
    { name: 'target_value', type: 'number' },
    { name: 'baseline_value', type: 'number' },
    { name: 'confidence', type: 'number', min: 0, max: 100 },
    {
      name: 'status',
      type: 'select',
      options: ['on_track', 'at_risk', 'behind', 'completed'].map(v => ({ label: v, value: v })),
      defaultValue: 'on_track',
    },
    { name: 'due_date', type: 'date' },
    { name: 'notes', type: 'textarea' },
  ],
}
