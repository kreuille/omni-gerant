import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed tenant
  const tenant = await prisma.tenant.upsert({
    where: { siret: '12345678901234' },
    update: {},
    create: {
      name: 'Entreprise Test SARL',
      siret: '12345678901234',
      siren: '123456789',
      naf_code: '4399C',
      legal_form: 'SARL',
      plan: 'pro',
      address: {
        line1: '12 Rue de la Paix',
        zip_code: '75002',
        city: 'Paris',
        country: 'FR',
      },
    },
  });

  // Seed admin user (password: TestPassword1)
  const user = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@test.com' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'admin@test.com',
      password_hash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash',
      first_name: 'Admin',
      last_name: 'Test',
      role: 'owner',
    },
  });

  // Seed a demo client
  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenant_id: tenant.id,
      type: 'company',
      company_name: 'Client Demo SAS',
      siret: '98765432109876',
      email: 'contact@clientdemo.fr',
      phone: '01 23 45 67 89',
      address_line1: '5 Avenue des Champs-Elysees',
      zip_code: '75008',
      city: 'Paris',
      country: 'FR',
      payment_terms: 30,
    },
  });

  // Seed a demo product
  await prisma.product.upsert({
    where: { tenant_id_reference: { tenant_id: tenant.id, reference: 'SRV-001' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      type: 'service',
      reference: 'SRV-001',
      name: 'Prestation de conseil',
      description: 'Conseil en gestion et organisation',
      unit: 'hour',
      unit_price_cents: 8000, // 80.00 EUR
      tva_rate: 2000, // 20%
      category: 'services',
    },
  });

  // Seed default tenant settings
  const settingsCategories = ['accounting', 'payments', 'ppf', 'connectors'];
  for (const category of settingsCategories) {
    await prisma.tenantSettings.upsert({
      where: { tenant_id_category: { tenant_id: tenant.id, category } },
      update: {},
      create: {
        tenant_id: tenant.id,
        category,
        data: {},
      },
    });
  }

  console.warn(`Seeded tenant: ${tenant.name} (${tenant.id})`);
  console.warn(`Seeded user: ${user.email} (${user.id})`);
  console.warn(`Seeded client: ${client.company_name}`);
  console.warn('Seeded 1 product, 4 tenant settings');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
