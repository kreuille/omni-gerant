// BUSINESS RULE [CDC-2.3]: Detection charges recurrentes
// Analyser les 6 derniers mois de transactions
// Detecter les patterns (meme montant, meme periode, meme fournisseur)
// Projeter sur les 3 prochains mois

export interface HistoricalTransaction {
  amount_cents: number;
  label: string;
  date: Date;
  category: string | null;
}

export interface RecurringCharge {
  label: string;
  amount_cents: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  category: string | null;
  confidence: number; // 0-1
  last_occurrence: Date;
  next_occurrences: Date[]; // Projected dates
}

interface AmountGroup {
  amount_cents: number;
  labels: string[];
  dates: Date[];
  category: string | null;
}

/**
 * Group transactions by similar amount (exact match in cents)
 */
function groupByAmount(transactions: HistoricalTransaction[]): AmountGroup[] {
  const groups = new Map<number, AmountGroup>();

  for (const tx of transactions) {
    // Only consider debits for recurring charges
    if (tx.amount_cents >= 0) continue;

    const key = tx.amount_cents;
    const existing = groups.get(key);
    if (existing) {
      existing.labels.push(tx.label);
      existing.dates.push(tx.date);
      if (tx.category) existing.category = tx.category;
    } else {
      groups.set(key, {
        amount_cents: tx.amount_cents,
        labels: [tx.label],
        dates: [tx.date],
        category: tx.category,
      });
    }
  }

  return [...groups.values()];
}

/**
 * Detect frequency from a list of dates
 */
function detectFrequency(
  dates: Date[],
): { frequency: 'monthly' | 'quarterly' | 'yearly'; confidence: number } | null {
  if (dates.length < 2) return null;

  // Sort dates ascending
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

  // Calculate gaps in days
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i]!.getTime() - sorted[i - 1]!.getTime();
    gaps.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (gaps.length === 0) return null;

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const stdDev = Math.sqrt(
    gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length,
  );

  // Monthly: ~28-31 days (avg ~30)
  if (avgGap >= 25 && avgGap <= 35 && stdDev <= 5) {
    const confidence = Math.max(0, 1 - stdDev / 10) * Math.min(1, dates.length / 3);
    return { frequency: 'monthly', confidence: Math.round(confidence * 100) / 100 };
  }

  // Quarterly: ~88-95 days (avg ~91)
  if (avgGap >= 80 && avgGap <= 100 && stdDev <= 10) {
    const confidence = Math.max(0, 1 - stdDev / 20) * Math.min(1, dates.length / 2);
    return { frequency: 'quarterly', confidence: Math.round(confidence * 100) / 100 };
  }

  // Yearly: ~355-375 days (avg ~365)
  if (avgGap >= 350 && avgGap <= 380 && stdDev <= 15) {
    const confidence = Math.max(0, 1 - stdDev / 30) * Math.min(1, dates.length / 2);
    return { frequency: 'yearly', confidence: Math.round(confidence * 100) / 100 };
  }

  return null;
}

/**
 * Pick the most common label from a group
 */
function pickLabel(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const l of labels) {
    // Normalize: uppercase, strip numbers
    const key = l.toUpperCase().replace(/\d+/g, '').trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let best = labels[0]!;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      // Find the original label matching this key
      best = labels.find((l) => l.toUpperCase().replace(/\d+/g, '').trim() === key) || best;
    }
  }
  return best;
}

/**
 * Project next occurrences based on frequency
 */
function projectDates(
  lastDate: Date,
  frequency: 'monthly' | 'quarterly' | 'yearly',
  count: number,
): Date[] {
  const dates: Date[] = [];
  const monthStep = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;

  for (let i = 1; i <= count; i++) {
    const next = new Date(lastDate);
    next.setMonth(next.getMonth() + monthStep * i);
    dates.push(next);
  }

  return dates;
}

/**
 * Detect recurring charges from 6 months of transaction history
 * Returns projected charges for the next 3 months
 */
export function detectRecurringCharges(
  transactions: HistoricalTransaction[],
  projectionMonths = 3,
  minConfidence = 0.5,
): RecurringCharge[] {
  const groups = groupByAmount(transactions);
  const charges: RecurringCharge[] = [];

  for (const group of groups) {
    if (group.dates.length < 2) continue;

    const detected = detectFrequency(group.dates);
    if (!detected) continue;
    if (detected.confidence < minConfidence) continue;

    const sortedDates = [...group.dates].sort((a, b) => a.getTime() - b.getTime());
    const lastOccurrence = sortedDates[sortedDates.length - 1]!;

    // Calculate how many occurrences fit in projectionMonths
    const occurrenceCount =
      detected.frequency === 'monthly'
        ? projectionMonths
        : detected.frequency === 'quarterly'
          ? Math.ceil(projectionMonths / 3)
          : projectionMonths >= 12
            ? 1
            : 0;

    if (occurrenceCount === 0) continue;

    const nextOccurrences = projectDates(lastOccurrence, detected.frequency, occurrenceCount);

    charges.push({
      label: pickLabel(group.labels),
      amount_cents: group.amount_cents,
      frequency: detected.frequency,
      category: group.category,
      confidence: detected.confidence,
      last_occurrence: lastOccurrence,
      next_occurrences: nextOccurrences,
    });
  }

  // Sort by confidence descending
  return charges.sort((a, b) => b.confidence - a.confidence);
}
