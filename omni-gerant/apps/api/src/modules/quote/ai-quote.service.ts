// Vague J3 : generation de devis par IA a partir d'une description en langage naturel.
//
// Input : "Refaire la salle de bains d'un T3. Faience, plomberie, peinture."
// Output : lignes de devis structurees avec unites, quantites et tarifs
// indicatifs (basee sur secteur + NAF). Utilise OpenAI gpt-4o-mini si cle presente,
// sinon fallback heuristique simple (split + estimation).

export interface AiQuoteLine {
  position: number;
  label: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  tva_rate: number;
}

export interface AiQuoteResult {
  title: string;
  lines: AiQuoteLine[];
  notes: string;
  source: 'llm' | 'heuristic';
  confidence: number;
}

interface GenerationInput {
  description: string;
  naf_code?: string;
  company_name?: string;
  context?: string;
}

export async function generateQuoteFromDescription(input: GenerationInput): Promise<AiQuoteResult> {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (apiKey) {
    try {
      return await generateLlm(apiKey, input);
    } catch { /* fallback */ }
  }
  return generateHeuristic(input);
}

async function generateLlm(apiKey: string, input: GenerationInput): Promise<AiQuoteResult> {
  const prompt = `Tu es assistant de facturation pour une TPE française (${input.company_name ?? 'entreprise'} ${input.naf_code ? `— NAF ${input.naf_code}` : ''}).

A partir de cette description, propose un devis structuré en JSON.

Description : "${input.description}"
Contexte client : ${input.context ?? 'N/A'}

Retourne STRICTEMENT ce JSON :
{
  "title": "...",
  "lines": [
    { "label": "...", "description": "...", "quantity": 1, "unit": "heure|jour|forfait|m²|unité", "unit_price_cents": 0, "tva_rate": 2000 }
  ],
  "notes": "conditions courtes",
  "confidence": 0.XX
}

Règles:
- Montants en centimes (entiers).
- TVA en basis points (2000 = 20%). Utilise 2000 par défaut sauf si secteur impose autre (5.5% pour travaux rénovation = 550, 10% pour restauration = 1000).
- Prix unitaires indicatifs marché français, cohérents avec le secteur.
- Lignes détaillées (pas un seul forfait global sauf si la description est vraiment vague).
- Max 10 lignes.
- title <= 100 chars.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');
  const parsed = JSON.parse(content) as {
    title?: string;
    lines?: Array<{ label?: string; description?: string; quantity?: number; unit?: string; unit_price_cents?: number; tva_rate?: number }>;
    notes?: string;
    confidence?: number;
  };
  const validLines = (parsed.lines ?? []).slice(0, 10).map((l, i) => ({
    position: i + 1,
    label: (l.label ?? 'Prestation').slice(0, 200),
    description: l.description?.slice(0, 500),
    quantity: Math.max(0.01, Number(l.quantity ?? 1)),
    unit: l.unit ?? 'unité',
    unit_price_cents: Math.max(0, Math.round(Number(l.unit_price_cents ?? 0))),
    tva_rate: [0, 210, 550, 1000, 2000].includes(Number(l.tva_rate)) ? Number(l.tva_rate) : 2000,
  }));
  return {
    title: (parsed.title ?? 'Devis').slice(0, 100),
    lines: validLines,
    notes: (parsed.notes ?? 'Devis valable 30 jours. Acompte 30% à la commande.').slice(0, 500),
    source: 'llm',
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.7))),
  };
}

function generateHeuristic(input: GenerationInput): AiQuoteResult {
  // Fallback : split phrases simples -> lignes forfaitaires 500 EUR HT chacune
  const sentences = input.description
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5)
    .slice(0, 6);

  const lines: AiQuoteLine[] = sentences.length > 0
    ? sentences.map((s, i) => ({
        position: i + 1,
        label: s.slice(0, 80),
        quantity: 1,
        unit: 'forfait',
        unit_price_cents: 50000, // 500 EUR HT par defaut
        tva_rate: 2000,
      }))
    : [{
        position: 1,
        label: 'Prestation',
        quantity: 1,
        unit: 'forfait',
        unit_price_cents: 50000,
        tva_rate: 2000,
      }];

  return {
    title: input.description.slice(0, 100) || 'Devis',
    lines,
    notes: 'Estimation indicative. À ajuster avec les tarifs réels.',
    source: 'heuristic',
    confidence: 0.3,
  };
}
