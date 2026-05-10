import type { CollectionConfig } from 'payload'

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'priority', 'due_date'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'status', type: 'select', options: ['todo', 'in_progress', 'done', 'cancelled', 'waiting'].map(v => ({ label: v, value: v })), defaultValue: 'todo' },
    { name: 'priority', type: 'number', min: 1, max: 5 },
    { name: 'energy_level', type: 'select', options: ['low', 'medium', 'high'].map(v => ({ label: v, value: v })) },
    { name: 'estimated_minutes', type: 'number' },
    { name: 'due_date', type: 'date' },
    { name: 'notes', type: 'textarea' },
  ],
}
