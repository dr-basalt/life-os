import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { stream } from 'hono/streaming'
import OpenAI from 'openai'
import { loadConstitution, buildSystemPrompt } from './constitution.js'
import { TOOL_DEFINITIONS, TOOL_MAP } from './tools.js'

const app = new Hono()

// ── Config ─────────────────────────────────────────────────────────────────
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1'
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen-2.5-coder-32b-instruct'
const ADMIN_TOKEN = process.env.SOMA_ADMIN_TOKEN || 'SternOSAdmin2026'

// ── LLM Client (OpenAI-compatible) ─────────────────────────────────────────
const llm = new OpenAI({
  baseURL: LLM_BASE_URL,
  apiKey: LLM_API_KEY || 'no-key',
})

// ── Constitution ──────────────────────────────────────────────────────────
const constitution = loadConstitution()
const SYSTEM_PROMPT = buildSystemPrompt(constitution)

// ── Conversation store (in-memory, per session) ───────────────────────────
const sessions = new Map()

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      messages: [],
      created_at: new Date().toISOString(),
    })
  }
  return sessions.get(id)
}

// ── Auth middleware ────────────────────────────────────────────────────────
function requireAuth(c, next) {
  const token = c.req.header('X-Admin-Token') || c.req.query('token')
  if (token !== ADMIN_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
}

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'X-Admin-Token'],
}))

// ── Tool execution engine ─────────────────────────────────────────────────
async function executeTool(name, args) {
  const fn = TOOL_MAP[name]
  if (!fn) return { error: `Unknown tool: ${name}` }
  try {
    const result = await fn(args)
    return result
  } catch (e) {
    return { error: e.message }
  }
}

// ── Agentic loop ───────────────────────────────────────────────────────────
async function* agentLoop(messages, onChunk) {
  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ]

  let iteration = 0
  const maxIterations = parseInt(process.env.SOMA_MAX_ITERATIONS || '8')

  while (iteration < maxIterations) {
    iteration++

    const response = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages: fullMessages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      stream: false,
      max_tokens: 2000,
      temperature: 0.3,
    })

    const choice = response.choices[0]
    const msg = choice.message

    // Add assistant message to history
    fullMessages.push(msg)

    // Stream text content if any
    if (msg.content) {
      yield { type: 'text', content: msg.content }
    }

    // If no tool calls, we're done
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      break
    }

    // Execute tool calls
    for (const toolCall of msg.tool_calls) {
      const { id, function: { name, arguments: argsStr } } = toolCall

      let args
      try { args = JSON.parse(argsStr) } catch { args = {} }

      yield { type: 'tool_call', name, args }

      const result = await executeTool(name, args)

      yield { type: 'tool_result', name, result }

      fullMessages.push({
        role: 'tool',
        tool_call_id: id,
        content: JSON.stringify(result),
      })
    }

    // If stop reason is not tool_calls, we're done
    if (choice.finish_reason !== 'tool_calls') break
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Health + constitution info
app.get('/health', (c) => c.json({
  status: 'ok',
  agent: constitution.identity.name,
  version: constitution.identity.version,
  model: LLM_MODEL,
  llm_gateway: LLM_BASE_URL,
}))

app.get('/constitution', (c) => c.json(constitution))

// List sessions
app.get('/sessions', (c) => {
  if (requireAuth(c, () => {}) instanceof Response) return requireAuth(c, () => {})
  return c.json(Array.from(sessions.values()).map(s => ({
    id: s.id,
    created_at: s.created_at,
    messages: s.messages.length,
  })))
})

// Chat — streaming SSE
app.post('/chat', async (c) => {
  const token = c.req.header('X-Admin-Token') || c.req.query('token')
  if (token !== ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401)

  const { message, session_id = 'default' } = await c.req.json()
  if (!message) return c.json({ error: 'message required' }, 400)

  const session = getSession(session_id)
  session.messages.push({ role: 'user', content: message })

  return stream(c, async (writer) => {
    const assistantChunks = []

    try {
      for await (const event of agentLoop(session.messages)) {
        const line = JSON.stringify(event)

        if (event.type === 'text') {
          assistantChunks.push(event.content)
        }

        await writer.write(`data: ${line}\n\n`)
      }
    } catch (e) {
      await writer.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`)
    }

    // Save assistant response to session
    const fullResponse = assistantChunks.join('')
    if (fullResponse) {
      session.messages.push({ role: 'assistant', content: fullResponse })
    }

    await writer.write('data: {"type":"done"}\n\n')
  }, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    }
  })
})

// Chat — non-streaming (for simple clients)
app.post('/chat/sync', async (c) => {
  const token = c.req.header('X-Admin-Token')
  if (token !== ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401)

  const { message, session_id = 'default' } = await c.req.json()
  if (!message) return c.json({ error: 'message required' }, 400)

  const session = getSession(session_id)
  session.messages.push({ role: 'user', content: message })

  const events = []
  try {
    for await (const event of agentLoop(session.messages)) {
      events.push(event)
    }
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }

  const textParts = events.filter(e => e.type === 'text').map(e => e.content)
  const fullResponse = textParts.join('')
  session.messages.push({ role: 'assistant', content: fullResponse })

  return c.json({ response: fullResponse, events, session_id })
})

// Clear session
app.delete('/sessions/:id', (c) => {
  const token = c.req.header('X-Admin-Token')
  if (token !== ADMIN_TOKEN) return c.json({ error: 'Unauthorized' }, 401)
  sessions.delete(c.req.param('id'))
  return c.json({ deleted: true })
})

serve({ fetch: app.fetch, port: 3002 }, (info) => {
  console.log(`\n🤖 SOMA — SternOS Agent Runtime`)
  console.log(`   Port:    ${info.port}`)
  console.log(`   Model:   ${LLM_MODEL}`)
  console.log(`   Gateway: ${LLM_BASE_URL}`)
  console.log(`   Constitution: loaded ✓\n`)
})
