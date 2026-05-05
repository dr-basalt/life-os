import type { RequestHandler } from './$types'

const SOMA_URL = process.env.SOMA_INTERNAL_URL || 'http://sternos-soma:3002'
const SOMA_TOKEN = process.env.SOMA_ADMIN_TOKEN || 'SternOSAdmin2026'

export const POST: RequestHandler = async ({ request }) => {
  const profile = await request.json()

  const prompt = `Tu es un architecte de vie expert. Voici le profil complet d'un utilisateur :

Prénom : ${profile.prenom || 'utilisateur'}
MBTI approximatif : ${profile.mbtiType || 'non défini'}
Situation : ${profile.situation || 'non défini'}
Revenus actuels : ${profile.revenus || 0}€/mois
Heures dispo/semaine pour projets : ${profile.heures || 10}h
Compétences : ${(profile.competences || []).join(', ')}
Rêve pro (5 ans) : ${profile.revePro || ''}
Mission : ${profile.mission || ''}
Domaines prioritaires : ${(profile.domaines || []).join(', ')}
P0 invariants : ${(profile.p0 || []).map((p: any) => `"${p.label}" (deadline: ${p.deadline})`).join(' | ')}
Ce qu'il ne veut plus jamais vivre : ${profile.nonVouloir || ''}

Génère une roadmap OKR sur 12 mois. Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "okrs": [
    {
      "titre": "string (ambitieux, concret, personnel)",
      "domaine": "string (un des domaines prioritaires exactement)",
      "face": "F1|F2|F3",
      "emoji": "string (1 emoji)",
      "description": "string (1-2 phrases, pourquoi cet OKR)",
      "deadline": "YYYY-MM-DD",
      "confidence": number (0-100),
      "key_results": [
        {
          "titre": "string (mesurable, binaire ou chiffré)",
          "valeur_cible": number,
          "unite": "string (€, kg, clients, %, h, ...)",
          "deadline": "YYYY-MM-DD"
        }
      ]
    }
  ],
  "insight_cle": "string (1 phrase percutante sur ce que le profil révèle — va dans les tripes)",
  "premier_pas": "string (L'ACTION CONCRÈTE à faire CETTE SEMAINE — ultra précise, pas de vague)"
}

Génère 3 à 5 OKRs couvrant les domaines prioritaires. Sois précis, ambitieux, aligné avec le rêve. Les KRs doivent être binaires ou numériques et mesurables. Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`

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
    const text = data.content || data.response || ''

    // Extraire le JSON : retirer éventuels blocs markdown ```json ... ```
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
