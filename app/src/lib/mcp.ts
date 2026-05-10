const MCP_URL = process.env.MCP_URL ?? 'http://sternos-mcp:3001'

async function mcpCall(tool: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${MCP_URL}/tools/${tool}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`MCP tool ${tool} failed: ${res.status}`)
  return res.json()
}

export async function getOkrs() {
  return mcpCall('get_okrs')
}

export async function getOkrDetail(okrId: string) {
  return mcpCall('get_okr_detail', { okr_id: okrId })
}

export async function getDailyBriefing() {
  return mcpCall('get_daily_briefing')
}

export async function searchInsights(query: string, limit = 5) {
  return mcpCall('search_insights', { query, limit })
}

export async function getUiSchema(pageId: string) {
  return mcpCall('get_ui_schema', { page_id: pageId })
}

export async function generateUiSchema(intent: string, contextOkrId?: string) {
  return mcpCall('generate_ui_schema', { intent, context_okr_id: contextOkrId })
}
