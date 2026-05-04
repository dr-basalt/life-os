import type { RequestHandler } from './$types'
import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC_API_KEY } from '$env/static/private'

export const POST: RequestHandler = async ({ request }) => {
  const profile = await request.json()

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

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

Génère 3 à 5 OKRs couvrant les domaines prioritaires. Sois précis, ambitieux, aligné avec le rêve. Les KRs doivent être binaires ou numériques et mesurables.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const roadmap = JSON.parse(jsonMatch[0])
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
