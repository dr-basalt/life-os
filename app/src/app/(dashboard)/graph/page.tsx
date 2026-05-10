import { GraphView } from '@/components/widgets/GraphView'

export const dynamic = 'force-dynamic'

async function getNeo4jGraph() {
  const neo4jUrl = process.env.NEO4J_HTTP_URL ?? 'http://sternos-neo4j:7474'
  const auth = Buffer.from(
    `${process.env.NEO4J_USER ?? 'neo4j'}:${process.env.NEO4J_PASSWORD ?? 'password'}`,
  ).toString('base64')

  try {
    const res = await fetch(`${neo4jUrl}/db/neo4j/tx/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        statements: [
          {
            statement: `
              MATCH (n)-[r]->(m)
              WHERE n.name IS NOT NULL AND m.name IS NOT NULL
              RETURN n, r, m LIMIT 100
            `,
          },
        ],
      }),
      cache: 'no-store',
    })

    if (!res.ok) return { nodes: [], edges: [] }

    const data = await res.json()
    const rows = data.results?.[0]?.data ?? []

    const nodeMap = new Map<string, { id: string; label: string; type: string }>()
    const edges: { source: string; target: string; label: string }[] = []

    for (const row of rows) {
      const [n, , m] = row.row
      const [nMeta, , mMeta] = row.meta

      const nId = String(nMeta.id)
      const mId = String(mMeta.id)
      const nLabel = n.name ?? n.title ?? nId
      const mLabel = m.name ?? m.title ?? mId
      const nType = nMeta.labels?.[0] ?? 'Node'
      const mType = mMeta.labels?.[0] ?? 'Node'

      if (!nodeMap.has(nId)) nodeMap.set(nId, { id: nId, label: nLabel, type: nType })
      if (!nodeMap.has(mId)) nodeMap.set(mId, { id: mId, label: mLabel, type: mType })

      edges.push({ source: nId, target: mId, label: row.meta[1]?.type ?? '' })
    }

    return { nodes: Array.from(nodeMap.values()), edges }
  } catch {
    return { nodes: [], edges: [] }
  }
}

export default async function GraphPage() {
  const { nodes, edges } = await getNeo4jGraph()

  return (
    <div className="page page-full">
      <GraphView nodes={nodes} edges={edges} />
    </div>
  )
}
