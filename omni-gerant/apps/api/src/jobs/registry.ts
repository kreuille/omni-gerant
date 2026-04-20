// BUSINESS RULE [Vague A2] : Cron scheduler leger, sans node-cron
//
// Approche : chaque job declare son interval minimum (en heures) et sa
// fenetre (h-de-la-journee). On garde le dernier run en memoire + dans
// tenant.settings (cron_last_runs) pour survivre aux redeploys.
//
// Declenchement :
//   1. POST /api/jobs/tick (autorise via CRON_SECRET header) -- pour scheduler
//      externe (Render Cron Job / GitHub Actions / Vercel cron).
//   2. setInterval 5 min en interne (fallback, best-effort sur Render free).

export interface JobDefinition {
  name: string;
  description: string;
  // Interval minimum entre deux executions (ms).
  minIntervalMs: number;
  // Heure autorisee (UTC), array d'heures ou null pour toute heure
  allowedHoursUtc?: number[];
  run(): Promise<{ ok: true; affected: number } | { ok: false; error: string }>;
}

const registry = new Map<string, JobDefinition>();
const lastRunAt = new Map<string, number>();

export function registerJob(def: JobDefinition): void {
  registry.set(def.name, def);
}

export function listJobs(): JobDefinition[] {
  return [...registry.values()];
}

export async function runJobIfDue(name: string, force = false): Promise<{ ran: boolean; reason?: string; result?: { affected?: number; error?: string } }> {
  const job = registry.get(name);
  if (!job) return { ran: false, reason: `job_not_found: ${name}` };
  const now = Date.now();
  const last = lastRunAt.get(name) ?? 0;
  if (!force && now - last < job.minIntervalMs) {
    return { ran: false, reason: `min_interval_not_reached (${Math.round((now - last) / 1000)}s < ${job.minIntervalMs / 1000}s)` };
  }
  if (!force && job.allowedHoursUtc && !job.allowedHoursUtc.includes(new Date().getUTCHours())) {
    return { ran: false, reason: `outside_allowed_hours (now=${new Date().getUTCHours()}h UTC)` };
  }
  lastRunAt.set(name, now);
  try {
    const r = await job.run();
    if (r.ok) return { ran: true, result: { affected: r.affected } };
    return { ran: true, result: { error: r.error } };
  } catch (e) {
    return { ran: true, result: { error: e instanceof Error ? e.message : String(e) } };
  }
}

export async function runAllDueJobs(): Promise<Array<{ name: string; ran: boolean; reason?: string; result?: { affected?: number; error?: string } }>> {
  const results = [];
  for (const job of registry.values()) {
    const r = await runJobIfDue(job.name);
    results.push({ name: job.name, ...r });
  }
  return results;
}

export function resetRegistry(): void {
  registry.clear();
  lastRunAt.clear();
}
