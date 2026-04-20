import type { FastifyInstance } from 'fastify';

// Vague Y1 : OpenAPI 3.1 spec
// Generation manuelle (plutot que depuis Zod) pour simplicite et stabilite.
// Les SDK generes depuis cette spec (Y3) peuvent se baser sur /api/openapi.json

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'zenAdmin Public API',
    version: '1.0.0',
    description: 'API publique de zenAdmin pour integrations tierces. Authentification : Bearer API key dans l\'en-tete Authorization.',
    contact: { name: 'zenAdmin', url: 'https://omni-gerant.vercel.app' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: 'https://omni-gerant-api.onrender.com', description: 'Production' },
    { url: 'http://localhost:3001', description: 'Local dev' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API key (prefix zen_live_)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
            required: ['code', 'message'],
          },
        },
      },
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['company', 'individual'] },
          company_name: { type: 'string', nullable: true },
          first_name: { type: 'string', nullable: true },
          last_name: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          siret: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          number: { type: 'string' },
          client_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['draft', 'finalized', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'] },
          issue_date: { type: 'string', format: 'date' },
          due_date: { type: 'string', format: 'date' },
          total_ht_cents: { type: 'integer' },
          total_tva_cents: { type: 'integer' },
          total_ttc_cents: { type: 'integer' },
        },
      },
      Quote: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          number: { type: 'string' },
          client_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['draft', 'sent', 'viewed', 'signed', 'refused', 'expired'] },
          total_ht_cents: { type: 'integer' },
          total_ttc_cents: { type: 'integer' },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/api/v1/clients': {
      get: {
        summary: 'Liste des clients',
        tags: ['Clients'],
        parameters: [
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100, default: 50 } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/Client' } },
                    next_cursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        summary: 'Creer un client',
        tags: ['Clients'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Client' } } } },
        responses: { '201': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Client' } } } } },
      },
    },
    '/api/v1/invoices': {
      get: {
        summary: 'Liste des factures',
        tags: ['Invoices'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100, default: 50 } },
        ],
        responses: { '200': { content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } } } } },
      },
    },
    '/api/v1/invoices/{id}': {
      get: {
        summary: 'Recuperer une facture',
        tags: ['Invoices'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } },
      },
    },
    '/api/v1/quotes': {
      get: {
        summary: 'Liste des devis',
        tags: ['Quotes'],
        responses: { '200': { content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Quote' } } } } } } } },
      },
    },
  },
  tags: [
    { name: 'Clients', description: 'Gestion des clients' },
    { name: 'Invoices', description: 'Factures' },
    { name: 'Quotes', description: 'Devis' },
  ],
};

export async function openapiRoutes(app: FastifyInstance) {
  // Spec JSON
  app.get('/api/openapi.json', async () => OPENAPI_SPEC);

  // Version simplifiee en YAML pour lecture humaine
  app.get('/api/openapi.yaml', async (_request, reply) => {
    reply.header('Content-Type', 'application/yaml');
    // On renvoie le JSON — les SDK generators acceptent les deux, et on evite une dep YAML
    return OPENAPI_SPEC;
  });

  // Mini SDK doc page
  app.get('/api/docs', async (_request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>zenAdmin API — Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>`;
  });
}
