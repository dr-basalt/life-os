// ═══════════════════════════════════════════════════════════════════════════
// STERN OS — Neo4j Persona Graph Seed — dr-basalt
// Contexte complet : chaîne traumatique, P0, OKRs, niches, patterns
// ═══════════════════════════════════════════════════════════════════════════

// Nœud User principal
MERGE (u:User {id: 'dr-basalt'})
SET u.name = 'dr-basalt',
    u.prenom = 'dr-basalt',
    u.email = 'contact@ori3com.cloud',
    u.mbti_type = 'INTJ',
    u.hd_type = 'Generator',
    u.hd_authority = 'Sacral',
    u.hd_profile = '4/1',
    u.situation = 'salarié en transition',
    u.mission = 'Libérer les producteurs de valeur des chaînes invisibles qui les empêchent de vivre leur vrai potentiel',
    u.vision_5ans = 'Vivre en liberté totale — revenus automatisés, corps musclé, amour conscient, ORI3COM scalé',
    u.axiome = 'Choisir ce n\'est pas renoncer, c\'est prioriser',
    u.created_at = datetime()
RETURN u.id;

// ─── DOULEURS (chaîne traumatique) ─────────────────────────────────────────
MERGE (d1:Douleur {id: 'injustice'})
SET d1.label = 'Blessure d\'injustice',
    d1.intensite = 9,
    d1.domaine = 'identité',
    d1.description = 'Triangle de Karpman en cours de désactivation. Sentiment profond que les règles du système sont injustes pour les producteurs de valeur.';

MERGE (d2:Douleur {id: 'dependance-affective'})
SET d2.label = 'Dépendance affective',
    d2.intensite = 7,
    d2.domaine = 'relation',
    d2.description = 'Attachement anxieux. Besoin de reconnaissance et d\'être vu.';

MERGE (d3:Douleur {id: 'abandon-solitude'})
SET d3.label = 'Abandon / Solitude',
    d3.intensite = 7,
    d3.domaine = 'relation',
    d3.description = 'Peur de l\'abandon. Solitude dans la vision (HPI dans un monde qui ne comprend pas).';

MERGE (d4:Douleur {id: 'perte-animale'})
SET d4.label = 'Perte animale / Attachement',
    d4.intensite = 6,
    d4.domaine = 'relation',
    d4.description = 'Attachement profond aux animaux. Perte vécue comme traumatisme.';

MERGE (d5:Douleur {id: 'controle-liberte'})
SET d5.label = 'Contrôle / Manque de liberté',
    d5.intensite = 8,
    d5.domaine = 'identité',
    d5.description = 'Besoin viscéral de liberté totale. Salarié = cage dorée. Le corps ressent le manque de liberté comme une oppression physique.';

// ─── PATTERNS ──────────────────────────────────────────────────────────────
MERGE (p1:Pattern {id: 'dispersion-tdah'})
SET p1.label = 'Dispersion TDAH créatif',
    p1.frequence = 'quotidien',
    p1.type = 'biais',
    p1.description = 'HPI+TDAH: génère 10 idées brillantes par jour, commence 5 projets simultanément, finit rarement. La dispersion est le principal frein au scale.';

MERGE (p2:Pattern {id: 'raisonnement-retrograde'})
SET p2.label = 'Raisonnement systémique rétrograde',
    p2.frequence = 'constant',
    p2.type = 'force',
    p2.description = 'Part de la cible finale et remonte vers le présent. Voit les systèmes complets avant les détails. Rare et précieux.';

MERGE (p3:Pattern {id: 'perfectionnisme-bloquant'})
SET p3.label = 'Perfectionnisme bloquant',
    p3.frequence = 'hebdomadaire',
    p3.type = 'sabotage',
    p3.description = 'Retravailler indéfiniment avant de lancer. Résolution: règle SCRD (Sortir, Corriger, Répéter, Dépasser).';

MERGE (p4:Pattern {id: 'meta-systemic'})
SET p4.label = 'Pensée méta-systémique',
    p4.frequence = 'constant',
    p4.type = 'force',
    p4.description = 'Construit des systèmes de systèmes. NCC, P0-MANTRA, Rubik\'s Cube de vie. Peut coder une meta-usine qui se reprogramme elle-même.';

MERGE (p5:Pattern {id: 'blessure-motrice'})
SET p5.label = 'Blessure → moteur créatif',
    p5.frequence = 'structurel',
    p5.type = 'force',
    p5.description = 'Chaque traumatisme a généré une niche produit. La chaîne traumatique = la carte de navigation entrepreneuriale.';

// ─── DÉSIRS PROFONDS ────────────────────────────────────────────────────────
MERGE (des1:Desir {id: 'liberte-totale'})
SET des1.label = 'Liberté totale',
    des1.profondeur = 'essentiel',
    des1.description = 'Ne plus avoir à demander la permission. Revenus automatisés. Partir quand et où je veux.';

MERGE (des2:Desir {id: 'etre-vu'})
SET des2.label = 'Être vu et reconnu',
    des2.profondeur = 'réel',
    des2.description = 'Être reconnu pour ce que je construis vraiment. Impact réel sur des vraies vies.';

MERGE (des3:Desir {id: 'transmettre'})
SET des3.label = 'Transmettre',
    des3.profondeur = 'essentiel',
    des3.description = 'Laisser un héritage. Méthode Stern, ORI3COM, NCC — que ça serve après moi.';

MERGE (des4:Desir {id: 'amour-conscient'})
SET des4.label = 'Amour conscient et aligné',
    des4.profondeur = 'essentiel',
    des4.description = 'Une relation où les deux partenaires se voient vraiment. Vision de Margaux comme reflet d\'un amour conscient possible.';

MERGE (des5:Desir {id: 'corps-libere'})
SET des5.label = 'Corps libéré et puissant',
    des5.profondeur = 'réel',
    des5.description = 'Objectif -30kg. Corps musclé. Chirurgie reconstructive possible. Le corps comme expression de la transformation.';

// ─── P0 INVARIANTS ──────────────────────────────────────────────────────────
MERGE (p0_1:P0 {id: 'liberte-revenus'})
SET p0_1.label = 'Liberté financière via revenus automatisés',
    p0_1.deadline = date('2027-01-01'),
    p0_1.domaine = 'Business & Finance',
    p0_1.non_negotiable = true;

MERGE (p0_2:P0 {id: 'quitter-salariat'})
SET p0_2.label = 'Quitter le salariat avec dignité',
    p0_2.deadline = date('2027-01-01'),
    p0_2.domaine = 'Liberté & Voyage',
    p0_2.non_negotiable = true;

MERGE (p0_3:P0 {id: 'corps-objectif'})
SET p0_3.label = 'Corps transformé — objectif -30kg + musculature',
    p0_3.deadline = date('2027-06-01'),
    p0_3.domaine = 'Corps & Santé',
    p0_3.non_negotiable = true;

MERGE (p0_4:P0 {id: 'coachlibre-lancé'})
SET p0_4.label = 'CoachLibre.fr lancé avec 1er client payant',
    p0_4.deadline = date('2026-09-01'),
    p0_4.domaine = 'Business & Finance',
    p0_4.non_negotiable = true;

MERGE (p0_5:P0 {id: 'ori3com-200k'})
SET p0_5.label = 'ORI3COM — 200k€ CA annualisé',
    p0_5.deadline = date('2026-10-01'),
    p0_5.domaine = 'Business & Finance',
    p0_5.non_negotiable = true;

// ─── NICHES (chaîne traumatique → produits) ─────────────────────────────────
MERGE (n1:Niche {id: 'ori3com'})
SET n1.nom = 'ORI3COM — AI Platform pour producteurs',
    n1.impact_potentiel = 10,
    n1.alignement_traumatique = 10,
    n1.domaine = 'B2B SaaS',
    n1.statut = 'en construction';

MERGE (n2:Niche {id: 'coachlibre'})
SET n2.nom = 'CoachLibre — Matching coach-client + Méthode Stern',
    n2.impact_potentiel = 9,
    n2.alignement_traumatique = 9,
    n2.domaine = 'B2C SaaS',
    n2.statut = 'MVP en cours';

MERGE (n3:Niche {id: 'unmecserieux'})
SET n3.nom = 'UnMecSérieux — Rencontres conscientes',
    n3.impact_potentiel = 7,
    n3.alignement_traumatique = 8,
    n3.domaine = 'B2C App',
    n3.statut = 'idéation';

MERGE (n4:Niche {id: 'jadopteunchien'})
SET n4.nom = 'JAdopteUnChien — Adoption responsable',
    n4.impact_potentiel = 6,
    n4.alignement_traumatique = 7,
    n4.domaine = 'B2C Marketplace',
    n4.statut = 'idéation';

MERGE (n5:Niche {id: 'therapeutelibre'})
SET n5.nom = 'ThérapeuteLibre — Plateforme thérapeutes',
    n5.impact_potentiel = 8,
    n5.alignement_traumatique = 7,
    n5.domaine = 'B2C/B2B SaaS',
    n5.statut = 'backlog';

// ─── OKRs (5 objectifs prioritaires) ───────────────────────────────────────
MERGE (okr1:OKR {id: 'okr-sante-corps'})
SET okr1.titre = 'Corps transformé — -20kg & vitalité maximale',
    okr1.face = 'F2',
    okr1.domaine = 'Corps & Santé',
    okr1.emoji = '💪',
    okr1.deadline = date('2026-10-01'),
    okr1.confidence = 70,
    okr1.statut = 'active';

MERGE (okr2:OKR {id: 'okr-ca-200k'})
SET okr2.titre = '200k€ CA annualisé ORI3COM',
    okr2.face = 'F1',
    okr2.domaine = 'Business & Finance',
    okr2.emoji = '💰',
    okr2.deadline = date('2026-10-01'),
    okr2.confidence = 60,
    okr2.statut = 'active';

MERGE (okr3:OKR {id: 'okr-coachlibre-mvp'})
SET okr3.titre = 'CoachLibre lancé — 1er client & MRR positif',
    okr3.face = 'F1',
    okr3.domaine = 'Business & Finance',
    okr3.emoji = '🎯',
    okr3.deadline = date('2026-09-01'),
    okr3.confidence = 75,
    okr3.statut = 'active';

MERGE (okr4:OKR {id: 'okr-webinaire'})
SET okr4.titre = 'Premier webinaire Liberty Cash — 100 inscrits',
    okr4.face = 'F3',
    okr4.domaine = 'Transmission & Impact',
    okr4.emoji = '🎤',
    okr4.deadline = date('2026-10-01'),
    okr4.confidence = 65,
    okr4.statut = 'active';

MERGE (okr5:OKR {id: 'okr-forge-qwen'})
SET okr5.titre = 'Forge Vibe-Coding Qwen35 WES opérationnelle',
    okr5.face = 'F1',
    okr5.domaine = 'Business & Finance',
    okr5.emoji = '⚙️',
    okr5.deadline = date('2026-05-04'),
    okr5.confidence = 80,
    okr5.statut = 'active';

// ─── RELATIONS User → Douleurs ───────────────────────────────────────────────
MATCH (u:User {id: 'dr-basalt'}), (d:Douleur {id: 'injustice'})
MERGE (u)-[:EXPRIME {poids: 0.9, timestamp: datetime()}]->(d);

MATCH (u:User {id: 'dr-basalt'}), (d:Douleur {id: 'dependance-affective'})
MERGE (u)-[:EXPRIME {poids: 0.7, timestamp: datetime()}]->(d);

MATCH (u:User {id: 'dr-basalt'}), (d:Douleur {id: 'abandon-solitude'})
MERGE (u)-[:EXPRIME {poids: 0.7, timestamp: datetime()}]->(d);

MATCH (u:User {id: 'dr-basalt'}), (d:Douleur {id: 'perte-animale'})
MERGE (u)-[:EXPRIME {poids: 0.6, timestamp: datetime()}]->(d);

MATCH (u:User {id: 'dr-basalt'}), (d:Douleur {id: 'controle-liberte'})
MERGE (u)-[:EXPRIME {poids: 0.8, timestamp: datetime()}]->(d);

// ─── RELATIONS User → Patterns ──────────────────────────────────────────────
MATCH (u:User {id: 'dr-basalt'}), (p:Pattern {id: 'dispersion-tdah'})
MERGE (u)-[:MANIFESTE {frequence: 'quotidien'}]->(p);

MATCH (u:User {id: 'dr-basalt'}), (p:Pattern {id: 'raisonnement-retrograde'})
MERGE (u)-[:MANIFESTE {frequence: 'constant'}]->(p);

MATCH (u:User {id: 'dr-basalt'}), (p:Pattern {id: 'perfectionnisme-bloquant'})
MERGE (u)-[:MANIFESTE {frequence: 'hebdomadaire'}]->(p);

MATCH (u:User {id: 'dr-basalt'}), (p:Pattern {id: 'meta-systemic'})
MERGE (u)-[:MANIFESTE {frequence: 'constant'}]->(p);

MATCH (u:User {id: 'dr-basalt'}), (p:Pattern {id: 'blessure-motrice'})
MERGE (u)-[:MANIFESTE {frequence: 'structurel'}]->(p);

// ─── RELATIONS User → Désirs ────────────────────────────────────────────────
MATCH (u:User {id: 'dr-basalt'}), (des:Desir {id: 'liberte-totale'})
MERGE (u)-[:DESIRE_PROFOND]->(des);

MATCH (u:User {id: 'dr-basalt'}), (des:Desir {id: 'etre-vu'})
MERGE (u)-[:DESIRE_PROFOND]->(des);

MATCH (u:User {id: 'dr-basalt'}), (des:Desir {id: 'transmettre'})
MERGE (u)-[:DESIRE_PROFOND]->(des);

MATCH (u:User {id: 'dr-basalt'}), (des:Desir {id: 'amour-conscient'})
MERGE (u)-[:DESIRE_PROFOND]->(des);

MATCH (u:User {id: 'dr-basalt'}), (des:Desir {id: 'corps-libere'})
MERGE (u)-[:DESIRE_PROFOND]->(des);

// ─── RELATIONS User → P0 ────────────────────────────────────────────────────
MATCH (u:User {id: 'dr-basalt'}), (p0:P0) MERGE (u)-[:A_P0]->(p0);

// ─── RELATIONS Douleur → Niche (chaîne traumatique) ─────────────────────────
MATCH (d:Douleur {id: 'injustice'}), (n:Niche {id: 'ori3com'})
MERGE (d)-[:NAIT_IDEE {force: 0.95}]->(n);

MATCH (d:Douleur {id: 'dependance-affective'}), (n:Niche {id: 'unmecserieux'})
MERGE (d)-[:NAIT_IDEE {force: 0.8}]->(n);

MATCH (d:Douleur {id: 'abandon-solitude'}), (n:Niche {id: 'coachlibre'})
MERGE (d)-[:NAIT_IDEE {force: 0.85}]->(n);

MATCH (d:Douleur {id: 'perte-animale'}), (n:Niche {id: 'jadopteunchien'})
MERGE (d)-[:NAIT_IDEE {force: 0.75}]->(n);

MATCH (d:Douleur {id: 'controle-liberte'}), (n:Niche {id: 'therapeutelibre'})
MERGE (d)-[:NAIT_IDEE {force: 0.7}]->(n);

// ─── RELATIONS Niche → OKR ──────────────────────────────────────────────────
MATCH (n:Niche {id: 'coachlibre'}), (okr:OKR {id: 'okr-coachlibre-mvp'})
MERGE (n)-[:ALIMENTE]->(okr);

MATCH (n:Niche {id: 'ori3com'}), (okr:OKR {id: 'okr-ca-200k'})
MERGE (n)-[:ALIMENTE]->(okr);

// ─── RELATIONS User → OKR ───────────────────────────────────────────────────
MATCH (u:User {id: 'dr-basalt'}), (okr:OKR) MERGE (u)-[:POURSUIT]->(okr);

// ─── TENSIONS (contradictions actives) ─────────────────────────────────────
MATCH (d:Douleur {id: 'controle-liberte'}), (des:Desir {id: 'liberte-totale'})
MERGE (d)-[:ENTRE_EN_TENSION_AVEC {label: 'Salarié qui rêve de liberté — tension centrale'}]->(des);

MATCH (d:Douleur {id: 'dependance-affective'}), (des:Desir {id: 'amour-conscient'})
MERGE (d)-[:ENTRE_EN_TENSION_AVEC {label: 'Besoin de reconnaissance vs amour inconditionnellement libre'}]->(des);

// ─── INDEX VECTORIEL (Neo4j 5.x native) ────────────────────────────────────
CREATE VECTOR INDEX douleur_embedding IF NOT EXISTS
FOR (d:Douleur) ON d.embedding
OPTIONS {indexConfig: {`vector.dimensions`: 1536, `vector.similarity_function`: 'cosine'}};

CREATE VECTOR INDEX insight_embedding IF NOT EXISTS
FOR (i:Insight) ON i.embedding
OPTIONS {indexConfig: {`vector.dimensions`: 1536, `vector.similarity_function`: 'cosine'}};

// ─── REQUÊTE DE VALIDATION ──────────────────────────────────────────────────
MATCH (u:User {id: 'dr-basalt'})-[r]->(n)
RETURN u.name, type(r), labels(n)[0], count(*) AS nb
ORDER BY nb DESC;
