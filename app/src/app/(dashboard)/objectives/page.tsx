import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const statusColor: Record<string, string> = {
  active: 'var(--success)',
  completed: 'var(--accent)',
  paused: 'var(--muted)',
  abandoned: 'var(--danger)',
}

export default async function ObjectivesPage() {
  const payload = await getPayload({ config })
  const { docs: objectives } = await payload.find({
    collection: 'objectives',
    sort: '-updatedAt',
    depth: 1,
  })

  return (
    <div className="page">
      <h1 className="page-title">Objectifs OKR</h1>
      <ul className="obj-list">
        {objectives.map(o => (
          <li key={o.id}>
            <Link href={`/objectives/${o.id}`} className="obj-card">
              <span className="obj-emoji">{o.emoji ?? '🎯'}</span>
              <div className="obj-info">
                <p className="obj-title">{o.title}</p>
                <div className="obj-meta">
                  <span style={{ color: statusColor[o.status] }}>{o.status}</span>
                  {o.okr_cycle && <span className="obj-cycle">{o.okr_cycle}</span>}
                  {o.confidence != null && (
                    <span className="obj-conf">{o.confidence}% confiance</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
