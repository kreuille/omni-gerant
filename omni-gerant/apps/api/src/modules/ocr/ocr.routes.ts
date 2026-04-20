import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.2 / P0-07] : Proxy OCR vers service Python FastAPI (apps/ocr/)
// Contract : le client envoie { file_b64, filename } en JSON ; on proxy
// en multipart/form-data vers POST {OCR_SERVICE_URL}/extract.

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/tiff': 'tiff',
  'image/bmp': 'bmp',
};

async function proxyToOcr(fileB64: string, filename: string, mime: string, apiKey: string | undefined): Promise<{ ok: true; data: unknown } | { ok: false; status: number; message: string }> {
  const base = process.env['OCR_SERVICE_URL'];
  if (!base) {
    return { ok: false, status: 503, message: 'Le service OCR n\'est pas configuré (OCR_SERVICE_URL manquant).' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileB64, 'base64');
  } catch (e) {
    return { ok: false, status: 400, message: 'Base64 invalide.' };
  }

  const form = new FormData();
  const blob = new Blob([buffer], { type: mime });
  form.append('file', blob, filename);

  try {
    const res = await fetch(`${base}/extract`, {
      method: 'POST',
      headers: apiKey ? { 'X-Api-Key': apiKey } : {},
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, message: `Service OCR en erreur : ${res.status} ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 504, message: `Service OCR indisponible : ${msg}` };
  }
}

export async function ocrRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];
  const API_KEY = process.env['OCR_SERVICE_API_KEY'];

  async function handleUpload(request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
    const body = (request.body ?? {}) as { file_b64?: string; mime?: string; filename?: string };
    if (!body.file_b64 || !body.mime) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Champs requis : file_b64 (base64), mime (ex: application/pdf).' },
      });
    }
    const ext = EXTENSIONS[body.mime];
    if (!ext) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: `MIME non supporté : ${body.mime}. Autorisés : pdf, png, jpg, tiff, bmp.` },
      });
    }
    const filename = body.filename ?? `upload.${ext}`;
    const r = await proxyToOcr(body.file_b64, filename, body.mime, API_KEY);
    if (!r.ok) {
      return reply.status(r.status).send({
        error: { code: 'OCR_UNAVAILABLE', message: r.message },
      });
    }
    return r.data;
  }

  // POST /api/ocr/upload
  app.post(
    '/api/ocr/upload',
    {
      preHandler: [...preHandlers, requirePermission('purchase', 'create')],
      bodyLimit: 15 * 1024 * 1024,
    },
    handleUpload,
  );

  // POST /api/purchases/ocr — alias documente dans CLAUDE.md
  app.post(
    '/api/purchases/ocr',
    {
      preHandler: [...preHandlers, requirePermission('purchase', 'create')],
      bodyLimit: 15 * 1024 * 1024,
    },
    handleUpload,
  );

  // GET /api/ocr/health
  app.get(
    '/api/ocr/health',
    { preHandler: [authenticate] },
    async (_request, reply) => {
      const base = process.env['OCR_SERVICE_URL'];
      if (!base) {
        return reply.status(503).send({ status: 'disabled', reason: 'OCR_SERVICE_URL non configuré' });
      }
      try {
        const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json().catch(() => ({}));
        return { status: res.ok ? 'up' : 'degraded', upstream_status: res.status, upstream: data };
      } catch (e) {
        return reply.status(503).send({ status: 'down', error: e instanceof Error ? e.message : String(e) });
      }
    },
  );
}
