import type { FC } from 'react'

type Blocker = {
  id: string
  title: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  related_okr?: string
  since?: string
}

type Props = {
  blockers: Blocker[]
}

const impactBadge: Record<string, string> = {
  low: '#3b82f6',
  medium: 'var(--warning)',
  high: 'var(--danger)',
  critical: '#dc2626',
}

export const BlockerMap: FC<Props> = ({ blockers }) => (
  <div className="blocker-map">
    <h2 className="widget-title">Blockers</h2>
    {blockers.length === 0 ? (
      <p className="muted">Aucun blocker actif</p>
    ) : (
      <ul className="blocker-list">
        {blockers.map(b => (
          <li key={b.id} className="blocker-item">
            <span
              className="impact-badge"
              style={{ background: impactBadge[b.impact] }}
            >
              {b.impact}
            </span>
            <div className="blocker-content">
              <p className="blocker-title">{b.title}</p>
              {b.related_okr && (
                <p className="blocker-meta">OKR: {b.related_okr}</p>
              )}
              {b.since && (
                <p className="blocker-meta">Depuis: {b.since}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
)
