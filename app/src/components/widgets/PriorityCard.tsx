import type { FC } from 'react'

type P0Item = {
  id: string
  label: string
  pain?: string
  urgency?: number
}

type Props = {
  items: P0Item[]
  title?: string
}

const urgencyColor = (u = 3) => {
  if (u >= 5) return 'var(--danger)'
  if (u >= 4) return 'var(--warning)'
  return 'var(--accent)'
}

export const PriorityCard: FC<Props> = ({ items, title = 'Priorités P0' }) => (
  <div className="priority-card">
    <h2 className="widget-title">{title}</h2>
    {items.length === 0 && <p className="muted">Aucun P0 actif</p>}
    <ul className="priority-list">
      {items.map(item => (
        <li key={item.id} className="priority-item">
          <span
            className="priority-dot"
            style={{ background: urgencyColor(item.urgency) }}
          />
          <div>
            <p className="priority-label">{item.label}</p>
            {item.pain && <p className="priority-pain">{item.pain}</p>}
          </div>
        </li>
      ))}
    </ul>
  </div>
)
