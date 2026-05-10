import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

const statusColor: Record<string, string> = {
  active: 'var(--success)',
  paused: 'var(--muted)',
  error: 'var(--danger)',
  pending: 'var(--warning)',
}

export default async function GatesPage() {
  const payload = await getPayload({ config })
  const { docs: gates } = await payload.find({
    collection: 'data_gates',
    sort: 'name',
  })

  return (
    <div className="page">
      <h1 className="page-title">Data Gates</h1>
      <div className="gates-grid">
        {gates.map(g => (
          <div key={g.id} className="gate-card">
            <div className="gate-header">
              <span className="gate-type">{g.type}</span>
              <span
                className="gate-status"
                style={{ color: statusColor[g.status] }}
              >
                {g.status}
              </span>
            </div>
            <p className="gate-name">{g.name}</p>
            {g.description && <p className="gate-desc">{g.description}</p>}
            {g.last_sync && (
              <p className="gate-sync">
                Sync: {new Date(g.last_sync).toLocaleString('fr-FR')}
              </p>
            )}
            {g.error_message && (
              <p className="gate-error">{g.error_message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
