// Vague E3 : categorisation automatique des achats (compta FR PCG).
//
// 2 strategies (fallback) :
//   1. Heuristique locale par regex/keyword sur label + supplier_name
//      + montant. Gratuit, instantane, sans deps externes.
//   2. OpenAI (facultatif si OPENAI_API_KEY defini) avec prompt
//      specialise PCG.
//
// Retourne toujours un AccountingCategory + confidence 0..1 + source.

export type AccountingCategory =
  | 'achats_marchandises'        // 607
  | 'achats_matieres_premieres'  // 601
  | 'achats_fournitures'         // 602
  | 'sous_traitance'             // 611
  | 'locations'                  // 613
  | 'entretien_reparations'      // 615
  | 'primes_assurances'          // 616
  | 'documentation'              // 618
  | 'personnel_exterieur'        // 621
  | 'honoraires'                 // 622
  | 'publicite'                  // 623
  | 'transport'                  // 624
  | 'deplacements'               // 625
  | 'frais_postaux_telecoms'     // 626
  | 'services_bancaires'         // 627
  | 'divers'                     // 628
  | 'carburant'                  // 606.3
  | 'energie'                    // 606.1
  | 'eau'                        // 606.2
  | 'fournitures_bureau'         // 606.4
  | 'logiciels_saas';            // 605 / 628 selon

export interface CategorizationResult {
  category: AccountingCategory;
  confidence: number; // 0..1
  pcg_account: string; // plan comptable general FR
  source: 'heuristic' | 'llm';
  reasoning?: string;
}

const PCG_ACCOUNT: Record<AccountingCategory, string> = {
  achats_marchandises: '607',
  achats_matieres_premieres: '601',
  achats_fournitures: '602',
  sous_traitance: '611',
  locations: '613',
  entretien_reparations: '615',
  primes_assurances: '616',
  documentation: '618',
  personnel_exterieur: '621',
  honoraires: '622',
  publicite: '623',
  transport: '624',
  deplacements: '625',
  frais_postaux_telecoms: '626',
  services_bancaires: '627',
  divers: '628',
  carburant: '606.3',
  energie: '606.1',
  eau: '606.2',
  fournitures_bureau: '606.4',
  logiciels_saas: '605',
};

interface Rule {
  category: AccountingCategory;
  keywords: RegExp;
  boost?: number;
}

const RULES: Rule[] = [
  { category: 'carburant', keywords: /\b(carburant|essence|gazole|diesel|super\s?95|e85|total|shell|bp|esso|station[\s-]service|leclerc\s?drive\s?carburant)\b/i, boost: 0.9 },
  { category: 'energie', keywords: /\b(edf|enedis|engie|electricite|gaz|total\s?energies|direct\s?energie)\b/i, boost: 0.9 },
  { category: 'eau', keywords: /\b(veolia|suez|eaux\s?de\s?paris|lyonnaise\s?des\s?eaux|facture\s?eau)\b/i, boost: 0.9 },
  { category: 'frais_postaux_telecoms', keywords: /\b(orange|sfr|bouygues|free|poste|la\s?poste|internet|telephone|mobile|forfait|abonnement\s?fibre|4g|5g|laposte)\b/i, boost: 0.85 },
  { category: 'logiciels_saas', keywords: /\b(saas|subscription|abonnement|licence|license|microsoft|google\s?workspace|slack|notion|github|gitlab|figma|adobe|salesforce|hubspot|zapier|airtable|stripe|shopify|squarespace|wordpress|wix|mailchimp|canva|dropbox|1password|ovhcloud|aws|azure|gcp)\b/i, boost: 0.85 },
  { category: 'services_bancaires', keywords: /\b(frais\s?bancaires?|commission\s?bancaire|agios|cotisation\s?carte|cb\s?pro|societe\s?generale|bnp|credit\s?agricole|lcl|caisse\s?d'?epargne|boursorama|qonto|shine)\b/i, boost: 0.8 },
  { category: 'primes_assurances', keywords: /\b(assurance|rc\s?pro|decennale|multirisque|mutuelle|axa|maif|macif|generali|allianz|groupama|matmut|maaf)\b/i, boost: 0.85 },
  { category: 'honoraires', keywords: /\b(honoraires|expert[\s-]comptable|comptable|avocat|notaire|consultant|conseil(s)?|audit)\b/i, boost: 0.8 },
  { category: 'sous_traitance', keywords: /\b(sous[\s-]traitance|sous[\s-]traitant|prestation\s?externe|freelance|auto[\s-]entrepreneur)\b/i, boost: 0.75 },
  { category: 'transport', keywords: /\b(chronopost|colissimo|dhl|ups|fedex|transport|livraison|expedition|fret)\b/i, boost: 0.8 },
  { category: 'deplacements', keywords: /\b(sncf|ouigo|thalys|eurostar|train|tgv|air\s?france|easyjet|ryanair|uber|taxi|blablacar|hotel|airbnb|booking|accor|ibis|novotel)\b/i, boost: 0.85 },
  { category: 'publicite', keywords: /\b(google\s?ads|facebook\s?ads|meta\s?ads|linkedin\s?ads|publicite|campagne|annonce|flyer|affichage)\b/i, boost: 0.8 },
  { category: 'fournitures_bureau', keywords: /\b(fournitures\s?bureau|papeterie|bureau\s?vall[ée]e|office\s?depot|staples|stylo|cahier|agrafeuse|toner|cartouche|imprimante)\b/i, boost: 0.8 },
  { category: 'entretien_reparations', keywords: /\b(entretien|reparation|maintenance|renovation|reparer|depannage|peinture|ma[çc]onnerie|plomberie|electricite\s?(travaux|installation))\b/i, boost: 0.7 },
  { category: 'locations', keywords: /\b(loyer|location|bail|bureaux\s?partages|coworking|wework|regus|spaces)\b/i, boost: 0.85 },
  { category: 'achats_marchandises', keywords: /\b(grossiste|stock|marchandise|produit\s?fini|amazon|cdiscount|metro\s?cash)\b/i, boost: 0.6 },
  { category: 'documentation', keywords: /\b(livre|ouvrage|documentation|abonnement\s?magazine|journal|presse)\b/i, boost: 0.7 },
];

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function categorizeHeuristic(input: {
  label: string;
  supplier_name?: string;
  description?: string;
  amount_cents?: number;
}): CategorizationResult {
  const haystack = normalize(`${input.label} ${input.supplier_name ?? ''} ${input.description ?? ''}`);
  let best: { category: AccountingCategory; score: number; matched: string } | null = null;

  for (const rule of RULES) {
    const match = haystack.match(rule.keywords);
    if (match) {
      const score = rule.boost ?? 0.7;
      if (!best || score > best.score) {
        best = { category: rule.category, score, matched: match[0] };
      }
    }
  }

  if (!best) {
    return {
      category: 'divers',
      confidence: 0.3,
      pcg_account: PCG_ACCOUNT['divers'],
      source: 'heuristic',
      reasoning: 'Aucune règle heuristique déclenchée.',
    };
  }

  return {
    category: best.category,
    confidence: best.score,
    pcg_account: PCG_ACCOUNT[best.category],
    source: 'heuristic',
    reasoning: `Mots-clés détectés : "${best.matched}"`,
  };
}

/**
 * Utilise OpenAI si OPENAI_API_KEY est defini. Sinon retombe sur heuristique.
 */
export async function categorizeWithLlm(input: {
  label: string;
  supplier_name?: string;
  description?: string;
  amount_cents?: number;
}): Promise<CategorizationResult> {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) return categorizeHeuristic(input);

  try {
    const categories = Object.keys(PCG_ACCOUNT).join(', ');
    const prompt = `Tu es un expert-comptable français. Categorise cet achat selon le Plan Comptable Général français.

Achat :
- Fournisseur : ${input.supplier_name ?? 'inconnu'}
- Libelle : ${input.label}
- Description : ${input.description ?? '-'}
- Montant : ${(input.amount_cents ?? 0) / 100} EUR

Categories possibles : ${categories}

Réponds UNIQUEMENT en JSON : {"category":"...","confidence":0.XX,"reasoning":"..."}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return categorizeHeuristic(input);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return categorizeHeuristic(input);
    const parsed = JSON.parse(content) as { category?: string; confidence?: number; reasoning?: string };
    if (parsed.category && parsed.category in PCG_ACCOUNT) {
      return {
        category: parsed.category as AccountingCategory,
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
        pcg_account: PCG_ACCOUNT[parsed.category as AccountingCategory],
        source: 'llm',
        reasoning: parsed.reasoning,
      };
    }
    return categorizeHeuristic(input);
  } catch {
    return categorizeHeuristic(input);
  }
}
