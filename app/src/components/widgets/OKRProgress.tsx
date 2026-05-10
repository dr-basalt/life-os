import type { FC } from 'react'

type KeyResult = {
  id: string
  title: string
  current_value?: number
  target_value?: number
  baseline_value?: number
  unit?: string
  status: string
  confidence?: number
}

type OKR = {
  id: string
  title: string
  emoji?: string
  status: string
  confidence?: number
  key_results: KeyResult[]
}

type Props = {
  okrs: OKR[]
}

function pct(kr: KeyResult): number {
  if (!kr.target_value || kr.target_value === 0) return 0
  const base = kr.baseline_value ?? 0
  const cur = kr.current_value ?? base
  return Math.min(100, Math.round(((cur - base) / (kr.target_value - base)) * 100))
}

const statusColor: Record<string, string> = {
  on_track: 'var(--success)',
  at_risk: 'var(--warning)',
  behind: 'var(--danger)',
  completed: 'var(--accent)',
}

export const OKRProgress: FC<Props> = ({ okrs }) => (
  <div className="okr-progress">
    {okrs.map(okr => (
      <details key={okr.id} className="okr-item" open>
        <summary className="okr-summary">
          {okr.emoji && <span>{okr.emoji} </span>}
          <span className="okr-title">{okr.title}</span>
          {okr.confidence != null && (
            <span className="okr-confidence">{okr.confidence}%</span>
          )}
        </summary>
        <ul className="kr-list">
          {okr.key_results.map(kr => {
            const p = pct(kr)
            return (
              <li key={kr.id} className="kr-item">
                <div className="kr-header">
                  <span className="kr-title">{kr.title}</span>
                  <span className="kr-value">
                    {kr.current_value ?? 0}/{kr.target_value ?? '?'} {kr.unit}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${p}%`,
                      background: statusColor[kr.status] ?? 'var(--accent)',
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </details>
    ))}
  </div>
)
