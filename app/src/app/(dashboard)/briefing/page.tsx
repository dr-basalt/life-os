import { getDailyBriefing } from '@/lib/mcp'
import { PriorityCard } from '@/components/widgets/PriorityCard'
import { BlockerMap } from '@/components/widgets/BlockerMap'
import { SearchResults } from '@/components/widgets/SearchResults'
import { ActionList } from '@/components/widgets/ActionList'

export const dynamic = 'force-dynamic'

export default async function BriefingPage() {
  let briefing: Record<string, unknown> = {}
  try {
    briefing = await getDailyBriefing()
  } catch {
    briefing = {}
  }

  const p0s = (briefing.p0s as unknown[] ?? []).map((p: unknown) => {
    const item = p as Record<string, unknown>
    return { id: item.id as string, label: item.label as string, pain: item.pain as string | undefined }
  })
  const blockers = (briefing.blockers as unknown[] ?? []) as Parameters<typeof BlockerMap>[0]['blockers']
  const insights = (briefing.insights as unknown[] ?? []) as Parameters<typeof SearchResults>[0]['results']
  const tasks = (briefing.tasks as unknown[] ?? []) as Parameters<typeof ActionList>[0]['tasks']

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      <h1 className="page-title">Briefing — {today}</h1>
      <div className="briefing-grid">
        <PriorityCard items={p0s} title="Focus P0 du jour" />
        <BlockerMap blockers={blockers} />
        <SearchResults results={insights} query="insights du jour" />
        <ActionList tasks={tasks} />
      </div>
    </div>
  )
}
