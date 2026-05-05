import type { RequestHandler } from './$types'

const SOMA_URL = process.env.SOMA_INTERNAL_URL || 'http://sternos-soma:3002'
const SOMA_TOKEN = process.env.SOMA_ADMIN_TOKEN || 'SternOSAdmin2026'
const MCP_URL = process.env.MCP_INTERNAL_URL || 'http://sternos-mcp:3001'

async function fetchPersonaContext() {
  try {
    const res = await fetch(`${MCP_URL}/tools/get_context`, { method: 'POST' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function formatPersonaContext(ctx: any): string {
  if (!ctx) return ''
  const lines: string[] = []

  if (ctx.user?.name) lines.push(`Identité: ${ctx.user.name}`)
  if (ctx.user?.mission) lines.push(`Mission profonde: ${ctx.user.mission}`)

  if (ctx.douleurs?.length) {
    lines.push('\nDOULEURS FONDAMENTALES (ce qui a forgé le personnage):')
    ctx.douleurs.forEach((d: any) => lines.push(`  - [${d.intensite || '?'}/10] ${d.label}: ${d.description || ''}`))
  }
  if (ctx.patterns?.length) {
    lines.push('\nPATTERNS COMPORTEMENTAUX (tendances récurrentes):')
    ctx.patterns.forEach((p: any) => lines.push(`  - ${p.label}: ${p.description || ''}`))
  }
  if (ctx.desirs?.length) {
    lines.push('\nDÉSIRS PROFONDS (ce qui tire vers l\'avant):')
    ctx.desirs.forEach((d: any) => lines.push(`  - ${d.label}: ${d.description || ''}`))
  }
  if (ctx.p0s?.length) {
    lines.push('\nP0 INVARIANTS (lignes rouges absolues dans Neo4j):')
    ctx.p0s.forEach((p: any) => lines.push(`  - "${p.label}": ${p.description || ''}`))
  }

  return lines.join('\n')
}

export const POST: RequestHandler = async ({ request }) => {
  const profile = await request.json()

  // Récupérer le contexte persona depuis Neo4j via MCP
  const personaCtx = await fetchPersonaContext()
  const personaSection = formatPersonaContext(personaCtx)

  // P0 saisis à l'onboarding (complètent/précisent les P0 Neo4j)
  const p0Onboarding = (profile.p0 || []).map((p: any) => `"${p.label}" (deadline: ${p.deadline})`).join(' | ')

  const prompt = `Tu es un architecte de vie expert. Tu dois générer une roadmap OKR ALIGNÉE entre le contexte profond d'une personne (sa base de données de persona) et ses P0 déclarés.

${personaSection ? `=== CONTEXTE PERSONA (base Neo4j dr-basalt) ===\n${personaSection}\n` : ''}
=== PROFIL ONBOARDING ===
Prénom : ${profile.prenom || 'utilisateur'}
Profil énergétique (MBTI) : ${profile.mbtiType || 'non défini'}
Situation : ${profile.situation || 'non défini'}
Revenus actuels : ${profile.revenus || 0}€/mois
Heures dispo/semaine : ${profile.heures || 10}h
Compétences : ${(profile.competences || []).join(', ')}
Rêve pro (5 ans) : ${profile.revePro || ''}
Domaines prioritaires : ${(profile.domaines || []).join(', ')}

=== P0 DÉCLARÉS À L'ONBOARDING ===
${p0Onboarding || 'Aucun P0 supplémentaire'}

Ce qu'il ne veut plus jamais vivre : ${profile.nonVouloir || ''}

=== INSTRUCTIONS ===
Génère une roadmap OKR 12 mois qui :
1. Respecte ABSOLUMENT les P0 (Neo4j + onboarding) — aucun OKR ne peut les violer
2. S'appuie sur les douleurs pour créer l'urgence et la motivation
3. Transforme les désirs profonds en objectifs concrets
4. Contourne les patterns comportementaux négatifs ou les convertit en force
5. Aligne produits/projets sur la mission et les niches identifiées

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "okrs": [
    {
      "titre": "string (ambitieux, concret, personnel)",
      "domaine": "string (un des domaines prioritaires)",
      "face": "F1|F2|F3",
      "emoji": "string (1 emoji)",
      "description": "string (1-2 phrases — pourquoi cet OKR, lien avec douleur/désir)",
      "deadline": "YYYY-MM-DD",
      "confidence": number (0-100),
      "key_results": [
        {
          "titre": "string (mesurable, binaire ou chiffré)",
          "valeur_cible": number,
          "unite": "string (€, clients, %, h, ...)",
          "deadline": "YYYY-MM-DD"
        }
      ]
    }
  ],
  "insight_cle": "string (1 phrase qui relie le persona profond aux P0 — va dans les tripes)",
  "premier_pas": "string (ACTION CONCRÈTE cette semaine — ultra précise)",
  "alignement_neo4j": "string (comment cette roadmap honore les douleurs/désirs du persona)"
}

Génère 4 à 6 OKRs. Sois précis, ancré dans le vécu réel du persona.`

  try {
    const res = await fetch(`${SOMA_URL}/chat/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': SOMA_TOKEN,
      },
      body: JSON.stringify({
        message: prompt,
        session_id: `onboarding-${Date.now()}`,
      }),
    })

    if (!res.ok) throw new Error(`SOMA error: ${res.status}`)

    const data = await res.json()
    const text = data.response || data.content || ''

    let raw = text.trim()
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) {
      raw = codeBlock[1].trim()
    } else {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in SOMA response')
      raw = jsonMatch[0]
    }

    const roadmap = JSON.parse(raw)
    // Injecter le flag pour indiquer si Neo4j a été utilisé
    roadmap._neo4j_enriched = !!personaCtx
    return new Response(JSON.stringify(roadmap), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
