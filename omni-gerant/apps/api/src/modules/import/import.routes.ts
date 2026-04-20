import type { FastifyInstance } from 'fastify';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';
import { parseCsv, normalizeHeader, type ImportReport } from '../../lib/csv.js';

// Vague G1 : import CSV clients et produits.
// Body JSON : { csv_content: string } (base64 optionnel via csv_b64).

const CLIENT_ALIASES: Record<string, string> = {
  nom: 'company_name',
  raison_sociale: 'company_name',
  societe: 'company_name',
  company: 'company_name',
  company_name: 'company_name',
  siret: 'siret',
  email: 'email',
  mail: 'email',
  courriel: 'email',
  tel: 'phone',
  telephone: 'phone',
  phone: 'phone',
  prenom: 'first_name',
  first_name: 'first_name',
  nom_famille: 'last_name',
  last_name: 'last_name',
  adresse: 'address_line1',
  address: 'address_line1',
  address_line1: 'address_line1',
  code_postal: 'zip_code',
  zip: 'zip_code',
  zip_code: 'zip_code',
  cp: 'zip_code',
  ville: 'city',
  city: 'city',
  pays: 'country',
  country: 'country',
  notes: 'notes',
};

const PRODUCT_ALIASES: Record<string, string> = {
  nom: 'name',
  name: 'name',
  reference: 'reference',
  ref: 'reference',
  description: 'description',
  prix_ht: 'unit_price_cents',
  prix: 'unit_price_cents',
  price: 'unit_price_cents',
  prix_unitaire: 'unit_price_cents',
  unit_price: 'unit_price_cents',
  tva: 'tva_rate',
  tva_rate: 'tva_rate',
  vat: 'tva_rate',
  unite: 'unit',
  unit: 'unit',
  stock: 'stock_qty',
  stock_qty: 'stock_qty',
  quantite: 'stock_qty',
};

function mapRow(row: Record<string, string>, aliases: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const target = aliases[normalizeHeader(k)];
    if (target) out[target] = v;
  }
  return out;
}

function parseCents(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace('€', '').replace('EUR', '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function parseTvaRate(raw: string | undefined): number {
  if (!raw) return 2000;
  const cleaned = raw.replace(/[,%\s]/g, '.').trim();
  const n = Number(cleaned.replace(/\.\./g, '.'));
  if (!Number.isFinite(n)) return 2000;
  // 20 -> 2000 basis points. 0.2 -> 2000 aussi.
  if (n >= 100) return Math.round(n); // deja en basis points
  if (n >= 1) return Math.round(n * 100); // pourcentage
  return Math.round(n * 10000); // ratio
}

export async function importRoutes(app: FastifyInstance) {
  const preHandlers = [authenticate, injectTenant];

  // POST /api/import/clients — import CSV clients
  app.post(
    '/api/import/clients',
    {
      preHandler: [...preHandlers, requirePermission('client', 'create')],
      bodyLimit: 5 * 1024 * 1024, // 5 MB
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { csv_content?: string; csv_b64?: string; dry_run?: boolean };
      const csv = body.csv_b64
        ? Buffer.from(body.csv_b64, 'base64').toString('utf-8')
        : body.csv_content ?? '';
      if (!csv.trim()) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'CSV vide. Fournir csv_content ou csv_b64.' } });
      }

      const parsed = parseCsv(csv);
      const report: ImportReport<{ company_name: string }> = {
        total: parsed.row_count,
        imported: 0,
        skipped: 0,
        errors: [],
        created_ids: [],
      };

      if (!process.env['DATABASE_URL']) {
        return reply.status(503).send({
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Base de données indisponible.' },
        });
      }

      const { prisma } = await import('@zenadmin/db');

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i]!;
        const mapped = mapRow(row, CLIENT_ALIASES);

        // Validation minimale
        const hasCompany = !!mapped['company_name']?.trim();
        const hasIndividual = !!mapped['first_name']?.trim() && !!mapped['last_name']?.trim();
        if (!hasCompany && !hasIndividual) {
          report.errors.push({ line: i + 2, message: 'Ni company_name ni first_name+last_name.' });
          report.skipped++;
          continue;
        }

        if (body.dry_run) {
          report.imported++;
          continue;
        }

        try {
          const created = await prisma.client.create({
            data: {
              tenant_id: request.auth.tenant_id,
              type: hasCompany ? 'company' : 'individual',
              company_name: mapped['company_name'] ?? null,
              first_name: mapped['first_name'] ?? null,
              last_name: mapped['last_name'] ?? null,
              email: mapped['email'] ?? null,
              phone: mapped['phone'] ?? null,
              siret: (mapped['siret'] ?? '').replace(/\D/g, '') || null,
              address_line1: mapped['address_line1'] ?? null,
              zip_code: mapped['zip_code'] ?? null,
              city: mapped['city'] ?? null,
              country: mapped['country']?.toUpperCase().slice(0, 2) || 'FR',
              notes: mapped['notes'] ?? null,
              payment_terms: 30,
            },
          });
          report.imported++;
          report.created_ids.push(created.id);
        } catch (e) {
          report.errors.push({
            line: i + 2,
            message: e instanceof Error ? e.message.slice(0, 200) : 'unknown',
            data: mapped as { company_name: string },
          });
          report.skipped++;
        }
      }

      return { report, headers: parsed.headers, separator: parsed.separator };
    },
  );

  // POST /api/import/products — import CSV produits
  app.post(
    '/api/import/products',
    {
      preHandler: [...preHandlers, requirePermission('product', 'create')],
      bodyLimit: 5 * 1024 * 1024,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { csv_content?: string; csv_b64?: string; dry_run?: boolean };
      const csv = body.csv_b64
        ? Buffer.from(body.csv_b64, 'base64').toString('utf-8')
        : body.csv_content ?? '';
      if (!csv.trim()) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'CSV vide.' } });
      }

      const parsed = parseCsv(csv);
      const report: ImportReport<{ name: string }> = {
        total: parsed.row_count,
        imported: 0,
        skipped: 0,
        errors: [],
        created_ids: [],
      };

      if (!process.env['DATABASE_URL']) {
        return reply.status(503).send({
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Base de données indisponible.' },
        });
      }

      const { prisma } = await import('@zenadmin/db');

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i]!;
        const mapped = mapRow(row, PRODUCT_ALIASES);
        const name = mapped['name']?.trim();
        if (!name) {
          report.errors.push({ line: i + 2, message: 'name manquant.' });
          report.skipped++;
          continue;
        }
        const priceCents = parseCents(mapped['unit_price_cents']);
        const tvaRate = parseTvaRate(mapped['tva_rate']);

        if (body.dry_run) {
          report.imported++;
          continue;
        }

        try {
          const created = await prisma.product.create({
            data: {
              tenant_id: request.auth.tenant_id,
              name,
              reference: mapped['reference'] ?? null,
              description: mapped['description'] ?? null,
              unit_price_cents: priceCents ?? 0,
              tva_rate: tvaRate,
              unit: mapped['unit'] ?? 'unite',
            },
          });
          report.imported++;
          report.created_ids.push(created.id);
        } catch (e) {
          report.errors.push({
            line: i + 2,
            message: e instanceof Error ? e.message.slice(0, 200) : 'unknown',
            data: mapped as { name: string },
          });
          report.skipped++;
        }
      }

      return { report, headers: parsed.headers, separator: parsed.separator };
    },
  );

  // GET /api/import/template/:type — renvoie un CSV exemple vide
  app.get(
    '/api/import/template/:type',
    { preHandler: preHandlers },
    async (request, reply) => {
      const { type } = request.params as { type: 'clients' | 'products' };
      let content: string;
      if (type === 'clients') {
        content = 'company_name;siret;email;phone;first_name;last_name;address_line1;zip_code;city;country;notes\n';
        content += 'Exemple SARL;89024639000029;contact@exemple.fr;0123456789;Jean;Dupont;10 rue de la Paix;75001;Paris;FR;Client test\n';
      } else if (type === 'products') {
        content = 'name;reference;description;unit_price_cents;tva_rate;unit\n';
        content += 'Prestation conseil;CSL-001;1h de conseil;15000;2000;heure\n';
      } else {
        return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'type inconnu : clients ou products' } });
      }
      return reply
        .type('text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="template-${type}.csv"`)
        .send('\uFEFF' + content); // BOM pour Excel
    },
  );
}
