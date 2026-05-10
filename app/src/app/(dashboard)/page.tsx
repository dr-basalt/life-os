import { getPayload } from 'payload'
import config from '@payload-config'
import { OKRProgress } from '@/components/widgets/OKRProgress'
import { PriorityCard } from '@/components/widgets/PriorityCard'
import { ActionList } from '@/components/widgets/ActionList'

export const dynamic = 'force-dynamic'

async function getData() {
  const payload = await getPayload({ config })

  const [objectivesRes, tasksRes] = await Promise.all([
    payload.find({
      collection: 'objectives',
      where: { status: { equals: 'active' } },
      depth: 2,
    }),
    payload.find({
      collection: 'tasks',
      where: { status: { in: ['todo', 'in_progress'] } },
      sort: '-priority',
      limit: 10,
    }),
  ])

  return {
    objectives: objectivesRes.docs,
    tasks: tasksRes.docs,
  }
}

export default async function DashboardPage() {
  const { objectives, tasks } = await getData()

  const p0Items = objectives
    .filter(o => o.confidence != null && o.confidence < 50)
    .map(o => ({ id: o.id, label: o.title, pain: o.description ?? undefined }))

  const okrsForWidget = objectives.map(o => ({
    id: o.id,
    title: o.title,
    emoji: o.emoji ?? undefined,
    status: o.status,
    confidence: o.confidence ?? undefined,
    key_results: Array.isArray(o.key_results)
      ? o.key_results.map((kr: Record<string, unknown>) => ({
          id: kr.id as string,
          title: kr.title as string,
          current_value: kr.current_value as number | undefined,
          target_value: kr.target_value as number | undefined,
          baseline_value: kr.baseline_value as number | undefined,
          unit: kr.unit as string | undefined,
          status: (kr.status as string) || 'on_track',
          confidence: kr.confidence as number | undefined,
        }))
      : [],
  }))

  return (
    <div className="dashboard-grid">
      <PriorityCard items={p0Items} />
      <OKRProgress okrs={okrsForWidget} />
      <ActionList tasks={tasks as Parameters<typeof ActionList>[0]['tasks']} />
    </div>
  )
}
