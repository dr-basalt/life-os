import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { OKRProgress } from '@/components/widgets/OKRProgress'
import { ActionList } from '@/components/widgets/ActionList'

export const dynamic = 'force-dynamic'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })

  const [obj, krsRes, tasksRes, victoriesRes] = await Promise.all([
    payload.findByID({ collection: 'objectives', id, depth: 0 }).catch(() => null),
    payload.find({ collection: 'key_results', where: { objective: { equals: id } } }),
    payload.find({ collection: 'tasks', where: { status: { in: ['todo', 'in_progress'] } }, limit: 20 }),
    payload.find({ collection: 'victories', where: { objective: { equals: id } }, sort: '-date', limit: 5 }),
  ])

  if (!obj) notFound()

  const okrForWidget = [{
    id: obj.id,
    title: obj.title,
    emoji: obj.emoji ?? undefined,
    status: obj.status,
    confidence: obj.confidence ?? undefined,
    key_results: krsRes.docs.map(kr => ({
      id: kr.id,
      title: kr.title,
      current_value: kr.current_value ?? undefined,
      target_value: kr.target_value ?? undefined,
      baseline_value: kr.baseline_value ?? undefined,
      unit: kr.unit ?? undefined,
      status: kr.status,
      confidence: kr.confidence ?? undefined,
    })),
  }]

  return (
    <div className="page">
      <h1 className="page-title">
        {obj.emoji ?? '🎯'} {obj.title}
      </h1>
      {obj.description && <p className="page-desc">{obj.description}</p>}

      <OKRProgress okrs={okrForWidget} />

      <h2 className="section-title">Actions</h2>
      <ActionList tasks={tasksRes.docs as Parameters<typeof ActionList>[0]['tasks']} />

      {victoriesRes.docs.length > 0 && (
        <section>
          <h2 className="section-title">Victoires</h2>
          <ul className="victory-list">
            {victoriesRes.docs.map(v => (
              <li key={v.id} className="victory-item">
                <span>{v.emoji ?? '🏆'}</span>
                <div>
                  <p className="victory-title">{v.title}</p>
                  <p className="victory-meta">{v.impact} · {v.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
