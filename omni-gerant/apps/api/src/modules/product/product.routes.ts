import type { FastifyInstance } from 'fastify';
import { createProductService, type ProductRepository, type Product } from './product.service.js';
import { createProductSchema, updateProductSchema, productListQuerySchema } from './product.schemas.js';
import { authenticate, requirePermission } from '../../plugins/auth.js';
import { injectTenant } from '../../plugins/tenant.js';

// BUSINESS RULE [CDC-2.1]: Endpoints produits/ouvrages
// BUSINESS RULE [R02]: Prix en centimes

export async function productRoutes(app: FastifyInstance) {
  // Placeholder in-memory repo
  const products = new Map<string, Product>();

  const repo: ProductRepository = {
    async create(data) {
      const id = crypto.randomUUID();
      const product: Product = {
        id,
        tenant_id: data.tenant_id,
        type: data.type ?? 'service',
        reference: data.reference ?? null,
        name: data.name,
        description: data.description ?? null,
        unit: data.unit ?? 'unit',
        unit_price_cents: data.unit_price_cents,
        tva_rate: data.tva_rate ?? 20,
        category: data.category ?? null,
        is_active: data.is_active ?? true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      products.set(id, product);
      return product;
    },
    async findById(id, tenantId) {
      const p = products.get(id);
      if (!p || p.tenant_id !== tenantId || p.deleted_at) return null;
      return p;
    },
    async findByReference(reference, tenantId) {
      for (const p of products.values()) {
        if (p.reference === reference && p.tenant_id === tenantId && !p.deleted_at) {
          return p;
        }
      }
      return null;
    },
    async update(id, tenantId, data) {
      const p = products.get(id);
      if (!p || p.tenant_id !== tenantId || p.deleted_at) return null;
      const updated = { ...p, ...data, updated_at: new Date() } as Product;
      products.set(id, updated);
      return updated;
    },
    async softDelete(id, tenantId) {
      const p = products.get(id);
      if (!p || p.tenant_id !== tenantId) return false;
      p.deleted_at = new Date();
      return true;
    },
    async list(tenantId, query) {
      let items = [...products.values()].filter(
        (p) => p.tenant_id === tenantId && !p.deleted_at,
      );
      if (query.search) {
        const term = query.search.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            (p.reference && p.reference.toLowerCase().includes(term)),
        );
      }
      if (query.category) {
        items = items.filter((p) => p.category === query.category);
      }
      if (query.type) {
        items = items.filter((p) => p.type === query.type);
      }
      if (query.is_active !== undefined) {
        items = items.filter((p) => p.is_active === query.is_active);
      }
      const total = items.length;
      items = items.slice(0, query.limit);
      return { items, total };
    },
    async createMany(data) {
      let count = 0;
      for (const item of data) {
        const id = crypto.randomUUID();
        const product: Product = {
          id,
          tenant_id: item.tenant_id,
          type: item.type ?? 'service',
          reference: item.reference ?? null,
          name: item.name,
          description: item.description ?? null,
          unit: item.unit ?? 'unit',
          unit_price_cents: item.unit_price_cents,
          tva_rate: item.tva_rate ?? 20,
          category: item.category ?? null,
          is_active: item.is_active ?? true,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        };
        products.set(id, product);
        count++;
      }
      return count;
    },
  };

  const productService = createProductService(repo);
  const preHandlers = [authenticate, injectTenant];

  // POST /api/products
  app.post(
    '/api/products',
    { preHandler: [...preHandlers, requirePermission('product', 'create')] },
    async (request, reply) => {
      const parsed = createProductSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid product data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await productService.createProduct(request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'CONFLICT' ? 409 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send(result.value);
    },
  );

  // GET /api/products
  app.get(
    '/api/products',
    { preHandler: [...preHandlers, requirePermission('product', 'read')] },
    async (request, reply) => {
      const parsed = productListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { issues: parsed.error.issues } },
        });
      }
      const result = await productService.listProducts(request.auth.tenant_id, parsed.data);
      if (!result.ok) return reply.status(500).send({ error: result.error });
      return result.value;
    },
  );

  // GET /api/products/:id
  app.get(
    '/api/products/:id',
    { preHandler: [...preHandlers, requirePermission('product', 'read')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await productService.getProduct(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return result.value;
    },
  );

  // PATCH /api/products/:id
  app.patch(
    '/api/products/:id',
    { preHandler: [...preHandlers, requirePermission('product', 'update')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateProductSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid product data', details: { issues: parsed.error.issues } },
        });
      }
      const result = await productService.updateProduct(id, request.auth.tenant_id, parsed.data);
      if (!result.ok) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'CONFLICT' ? 409 : 400;
        return reply.status(status).send({ error: result.error });
      }
      return result.value;
    },
  );

  // DELETE /api/products/:id
  app.delete(
    '/api/products/:id',
    { preHandler: [...preHandlers, requirePermission('product', 'delete')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await productService.deleteProduct(id, request.auth.tenant_id);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      return reply.status(204).send();
    },
  );
}
