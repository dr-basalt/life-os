import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONSTITUTION_PATH = resolve(__dirname, '../../constitution/AGENT_CONSTITUTION.yaml')

export function loadConstitution() {
  const raw = readFileSync(CONSTITUTION_PATH, 'utf-8')
  return yaml.load(raw)
}

export function buildSystemPrompt(constitution, runtimeContext = '') {
  const c = constitution
  const principles = c.principles.map(p => `[${p.id}] ${p.label}: ${p.rule.trim()}`).join('\n')
  const forbidden = c.constraints.forbidden.map(f => `- INTERDIT: ${f}`).join('\n')
  const tools = c.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')

  return `Tu es ${c.identity.name} — ${c.identity.full_name} v${c.identity.version}.

=== MISSION ===
${c.identity.mission.trim()}

=== CONTEXTE PROJET ===
Project: ${c.context.project}
Base path: ${c.context.base_path}
Server: ${c.context.server}
Stack: SvelteKit + PocketBase + Neo4j + Windmill + Traefik (Docker)

=== PRINCIPES ===
${principles}

=== CONTRAINTES ===
${forbidden}

=== TOOLS DISPONIBLES ===
${tools}

=== CONTEXTE RUNTIME ===
${runtimeContext || 'Aucun contexte additionnel.'}

=== STYLE DE RÉPONSE ===
- Langue: français
- Ton: direct, technique, sans bullshit
- Avant chaque action: annonce en 1 ligne ce que tu vas faire
- Après chaque action: résumé bref de ce qui a été fait
- Si incertain: pose UNE seule question précise
- Format des diffs: montrer les lignes modifiées avec context

Tu peux appeler les tools fournis. Chaque tool est une fonction JSON.`
}
