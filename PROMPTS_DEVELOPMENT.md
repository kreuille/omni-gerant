# Prompts de Developpement - zenAdmin

> **Derniere mise a jour** : 2026-04-15

## Etat d'Avancement Global

| Phase | Prompts | Statut | Details |
|-------|---------|--------|---------|
| **1 — Fondations** | 1.1, 1.2, 1.3, 1.4 | ✅ COMPLETE | Monorepo pnpm+Turborepo, Prisma schema, Fastify API, Next.js 14 App Router |
| **2 — Donnees Metier** | 2.1, 2.2, 2.3 | ✅ COMPLETE | Tenants, clients, produits avec lookup SIRET |
| **3 — Auth & Securite** | 3.1, 3.2 | ✅ COMPLETE | JWT (access+refresh), 2FA TOTP, RBAC 4 roles, 13 ressources |
| **4 — Ventes** | 4.1–4.6 | ✅ COMPLETE | Devis, factures, Factur-X, situations, relances, workflow complet |
| **5 — Achats** | 5.1–5.4 | ✅ COMPLETE | CRUD achats/fournisseurs, OCR upload, email parsing, connecteurs portails |
| **6 — Banque** | 6.1–6.3 | ✅ COMPLETE | Open Banking (Bridge API), rapprochement (scoring), previsionnel tresorerie |
| **7 — Legal** | 7.1–7.3 | ✅ COMPLETE | DUERP (73 profils NAF complets), RGPD registre, coffre-fort assurances |
| **8 — Frontend** | 8.1, 8.2 | ✅ COMPLETE | Dashboard KPIs + graphique CA, onboarding wizard 4 etapes |
| **9 — Integrations** | 9.1–9.3 | ✅ COMPLETE | Export FEC, Stripe + GoCardless, connecteur PPF/PDP |
| **10 — Production** | 10.1–10.3 | ✅ COMPLETE | Cache + indexes, CSP + rate limiting, CI/CD GitHub Actions + Render + Vercel |

**Total : 32 prompts — 32 implementes (100%)**

### Chiffres Cles
- **694 tests unitaires** (Vitest, 62 fichiers)
- **51 tests E2E** (Playwright)
- **73 profils de risques NAF** (DUERP, tous secteurs francais 01-99)
- **Deploiement** : Frontend Vercel + API Render (free plan, in-memory)
- **Repo** : https://github.com/kreuille/zenadmin

---

## Prompt 1.1 — Setup Monorepo et Tooling ✅

Lis les skills 001 (result-pattern), 005 (zod-validation).

Cree le monorepo zenAdmin avec pnpm workspaces et Turborepo.

**Structure a creer :**
```
zenadmin/
  package.json              # Root workspace
  pnpm-workspace.yaml
  turbo.json
  .gitignore
  .nvmrc                    # Node 20 LTS
  apps/
    api/
      package.json
      tsconfig.json
      src/
        index.ts            # Point d'entree Fastify
        app.ts              # Configuration app
    web/
      package.json
      tsconfig.json
      next.config.js
      src/
        app/
          layout.tsx
          page.tsx
  packages/
    shared/
      package.json
      tsconfig.json
      src/
        index.ts
        result.ts           # Type Result<T,E> + helpers ok()/err()
        errors.ts           # Types d'erreurs AppError
        types.ts            # Types partages
        money.ts            # Type Money (centimes) + helpers
        validators.ts       # Schemas Zod de base
    db/
      package.json
      tsconfig.json
    config/
      eslint/
        base.js
      tsconfig/
        base.json
        nextjs.json
        node.json
```

**Regles :**
- TypeScript strict sur tous les packages
- ESLint + Prettier configures
- Vitest configure pour les packages TS
- `packages/shared/src/result.ts` : implementer le Result pattern complet avec :
  - `type Result<T, E = AppError>`
  - `function ok<T>(value: T): Result<T, never>`
  - `function err<E>(error: E): Result<never, E>`
  - `function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T }`
  - `function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E }`
  - `function unwrap<T, E>(result: Result<T, E>): T` (throw si err)
  - `function map<T, U, E>(result: Result<T, E>, fn: (v: T) => U): Result<U, E>`
- `packages/shared/src/money.ts` : implementer les helpers Money :
  - `type Money = { amount_cents: number; currency: 'EUR' }`
  - `function addMoney(...moneys: Money[]): Money`
  - `function subtractMoney(a: Money, b: Money): Money`
  - `function multiplyMoney(m: Money, factor: number): Money` (arrondi au centime)
  - `function formatMoney(m: Money): string` (ex: "15,00 EUR")
  - `function tvaAmount(ht: Money, rate: number): Money` (rate en basis points: 2000 = 20%)
  - `function ttcFromHt(ht: Money, rate: number): Money`

**Tests requis :**
- `packages/shared/src/__tests__/result.test.ts` : tester tous les helpers Result
- `packages/shared/src/__tests__/money.test.ts` : tester tous les helpers Money avec cas limites (arrondi, grands montants, taux multiples)

---

## Prompt 1.2 — Base de Donnees et Prisma ✅

Lis les skills 003 (multi-tenant), 004 (soft-delete), 006 (uuid-v7).

Configure Prisma dans `packages/db` avec PostgreSQL.

**Schema initial (`packages/db/prisma/schema.prisma`) :**

```prisma
// Tables fondation :
model Tenant {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String
  siret         String?  @unique
  siren         String?
  naf_code      String?
  legal_form    String?
  address       Json?
  settings      Json     @default("{}")
  plan          String   @default("starter") // free, starter, pro, expert
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  deleted_at    DateTime?
  
  users         User[]
  clients       Client[]
  products      Product[]
  quotes        Quote[]
  invoices      Invoice[]
  purchases     Purchase[]
  bank_accounts BankAccount[]
}

model User {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id     String   @db.Uuid
  email         String
  password_hash String
  first_name    String
  last_name     String
  role          String   @default("owner") // owner, admin, member, accountant
  totp_secret   String?
  totp_enabled  Boolean  @default(false)
  last_login_at DateTime?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  deleted_at    DateTime?
  
  tenant        Tenant   @relation(fields: [tenant_id], references: [id])
  
  @@unique([tenant_id, email])
}
```

**Fichiers a creer :**
- `packages/db/prisma/schema.prisma` : schema complet Tenant + User
- `packages/db/src/client.ts` : singleton Prisma client avec soft-delete middleware
- `packages/db/src/middleware/soft-delete.ts` : middleware qui :
  - Intercepte `delete` → transforme en `update { deleted_at: now() }`
  - Intercepte `deleteMany` → transforme en `updateMany`
  - Ajoute `where: { deleted_at: null }` sur `findMany`, `findFirst`, `findUnique`, `count`
- `packages/db/src/middleware/tenant.ts` : middleware qui injecte `tenant_id` dans les queries
- `packages/db/prisma/migrations/` : migration initiale
- `packages/db/prisma/seed.ts` : seed avec un tenant de test et un user admin

**SQL additionnel (post-migration) :**
```sql
-- RLS sur toutes les tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Tests requis :**
- `packages/db/src/__tests__/soft-delete.test.ts` : tester que delete → soft delete, que les queries filtrent deleted_at
- `packages/db/src/__tests__/client.test.ts` : tester la connexion et les operations CRUD de base

---

## Prompt 1.3 — Backend API Foundation ✅

Lis les skills 008 (structured-logging), 009 (error-handler), 020 (rate-limiter), 067 (health-check), 068 (graceful-shutdown).

Cree le serveur API Fastify dans `apps/api`.

**Fichiers a creer :**
```
apps/api/src/
  index.ts                  # Demarrage serveur
  app.ts                    # Configuration Fastify + plugins
  config.ts                 # Variables d'environnement (Zod validated)
  plugins/
    auth.ts                 # Plugin authentification (decorateurs)
    tenant.ts               # Plugin injection tenant_id
    error-handler.ts        # Gestion erreurs globale → format standard
    rate-limiter.ts         # Rate limiting par tenant
  middleware/
    request-context.ts      # AsyncLocalStorage pour correlation_id, tenant_id
  routes/
    health.ts               # GET /health, GET /ready
  lib/
    logger.ts               # Pino logger JSON structure
    shutdown.ts             # Graceful shutdown handler
  __tests__/
    health.test.ts
    error-handler.test.ts
```

**Specifications :**
- Fastify avec TypeBox pour le schema des routes
- Pino pour le logging JSON structure
- Chaque log contient : `correlation_id`, `tenant_id`, `user_id`, `method`, `url`, `status_code`, `duration_ms`
- Error handler qui convertit toutes les erreurs en format standard :
  ```json
  { "error": { "code": "RESOURCE_NOT_FOUND", "message": "...", "details": {} } }
  ```
- Rate limiter : 100 req/min par tenant (configurable)
- Health check : `/health` (liveness), `/ready` (readiness avec check DB)
- Graceful shutdown : drain les connexions, ferme la DB, timeout 10s
- Variables d'env validees avec Zod au demarrage (crash si invalide)

**Tests requis :**
- Test health endpoints
- Test error handler (erreurs connues et inconnues)
- Test rate limiter
- Test format des logs

---

## Prompt 1.4 — Frontend Foundation ✅

Lis les skills 044 (responsive-layout), 055 (theme-system), 056 (i18n).

Cree la base du frontend Next.js dans `apps/web`.

**Fichiers a creer :**
```
apps/web/src/
  app/
    layout.tsx              # Root layout avec providers
    page.tsx                # Landing / redirect to dashboard
    (auth)/
      login/page.tsx        # Page de connexion
      register/page.tsx     # Page d'inscription (skeleton)
    (dashboard)/
      layout.tsx            # Layout dashboard avec sidebar
      page.tsx              # Dashboard principal (skeleton)
  components/
    ui/                     # Composants UI de base
      button.tsx
      input.tsx
      card.tsx
      badge.tsx
      avatar.tsx
      dropdown-menu.tsx
      sheet.tsx             # Pour sidebar mobile
      skeleton.tsx
    layout/
      sidebar.tsx           # Sidebar navigation
      header.tsx            # Header avec user menu
      mobile-nav.tsx        # Navigation mobile
  lib/
    api-client.ts           # Client fetch type-safe vers l'API
    auth-context.tsx        # Context authentification
    cn.ts                   # Utility classnames (clsx + twMerge)
  styles/
    globals.css             # Tailwind + variables CSS custom
```

**Specifications :**
- Tailwind CSS avec variables CSS pour le theming
- Composants UI inspires de shadcn/ui (pas d'import, reimplementes)
- Layout responsive mobile-first :
  - Mobile : sidebar en sheet (overlay)
  - Desktop : sidebar fixe a gauche
- Sidebar avec navigation : Dashboard, Ventes, Achats, Banque, Legal, Parametres
- Header avec : nom de l'entreprise, avatar user, menu dropdown
- Dark mode supporte via CSS variables (pas implemente dans ce prompt, juste prepare)
- API client avec :
  - Base URL configurable
  - Auth header automatique (token JWT)
  - Gestion erreurs typee

**Tests requis :**
- Test du composant Button (rendu, variants)
- Test du layout (presence sidebar, header)
- Test de l'API client (mock fetch)

---

## Prompt 2.1 — Modele Entreprise et Lookup SIRET ✅

Lis les skills 005 (zod-validation), 022 (api-client), 027 (siret-lookup).

Implemente le module Entreprise (Tenant) avec lookup SIRET automatique.

**Fichiers a creer :**
```
apps/api/src/
  modules/
    tenant/
      tenant.routes.ts      # Routes CRUD tenant
      tenant.service.ts     # Logique metier
      tenant.schemas.ts     # Schemas Zod
      __tests__/
        tenant.service.test.ts
        tenant.routes.test.ts
  lib/
    siret-lookup.ts          # Client API Pappers/INSEE
    __tests__/
      siret-lookup.test.ts
apps/web/src/
  app/(dashboard)/
    settings/
      company/
        page.tsx             # Page parametres entreprise
  components/
    company/
      siret-form.tsx         # Formulaire avec auto-complete SIRET
```

**Specifications :**
- `GET /api/tenants/me` : infos du tenant courant
- `PATCH /api/tenants/me` : mise a jour parametres
- `GET /api/lookup/siret/:siret` : lookup SIRET → retourne nom, adresse, NAF, forme juridique
  - Source : API Pappers (gratuit pour lookup basique) ou API INSEE Sirene
  - Cache le resultat 24h
- Le formulaire SIRET dans le frontend :
  - Input SIRET avec masque de saisie (XXX XXX XXX XXXXX)
  - Auto-complete au fur et a mesure de la saisie
  - Pre-remplissage automatique des champs entreprise

**Tests requis :**
- Test service tenant (CRUD)
- Test lookup SIRET (mock API externe)
- Test validation schemas Zod

---

## Prompt 2.2 — Modele Client/Contact ✅

Lis les skills 005 (zod-validation), 007 (cursor-pagination), 039 (search-filter).

Implemente le module Clients.

**Schema Prisma a ajouter :**
```prisma
model Client {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String   @db.Uuid
  type            String   @default("company") // company, individual
  company_name    String?
  siret           String?
  first_name      String?
  last_name       String?
  email           String?
  phone           String?
  address_line1   String?
  address_line2   String?
  zip_code        String?
  city            String?
  country         String   @default("FR")
  notes           String?
  payment_terms   Int      @default(30) // jours
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  deleted_at      DateTime?

  tenant          Tenant   @relation(fields: [tenant_id], references: [id])
  quotes          Quote[]
  invoices        Invoice[]
}
```

**Fichiers a creer :**
```
apps/api/src/modules/client/
  client.routes.ts
  client.service.ts
  client.schemas.ts
  __tests__/
    client.service.test.ts
    client.routes.test.ts
apps/web/src/
  app/(dashboard)/clients/
    page.tsx                 # Liste clients avec recherche
    new/page.tsx             # Creation client
    [id]/page.tsx            # Detail/edition client
  components/client/
    client-list.tsx
    client-form.tsx
    client-card.tsx
```

**Specifications :**
- CRUD complet : `POST/GET/PATCH/DELETE /api/clients`
- `GET /api/clients` avec :
  - Cursor-based pagination (20 par page)
  - Recherche full-text sur nom, email, SIRET
  - Filtres : type (company/individual), ville
  - Tri : nom, date creation
- Validation Zod stricte sur creation/modification
- Frontend : liste avec recherche temps reel, formulaire creation/edition

**Tests requis :**
- Test CRUD complet
- Test pagination cursor-based
- Test recherche et filtres
- Test validation (cas invalides)

---

## Prompt 2.3 — Catalogue Produits/Services ✅

Lis les skills 002 (cents-money), 005 (zod-validation), 036 (tva-calculator).

Implemente le catalogue de produits et services.

**Schema Prisma a ajouter :**
```prisma
model Product {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String   @db.Uuid
  type            String   @default("service") // service, product
  reference       String?
  name            String
  description     String?
  unit            String   @default("unit") // unit, hour, day, m2, ml, kg, forfait
  unit_price_cents Int     // Prix unitaire HT en centimes
  tva_rate        Int      @default(2000) // Basis points: 2000 = 20%, 1000 = 10%, 550 = 5.5%
  category        String?
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  deleted_at      DateTime?

  tenant          Tenant   @relation(fields: [tenant_id], references: [id])
  
  @@unique([tenant_id, reference])
}
```

**Fichiers a creer :**
```
apps/api/src/modules/product/
  product.routes.ts
  product.service.ts
  product.schemas.ts
  __tests__/
    product.service.test.ts
apps/web/src/
  app/(dashboard)/products/
    page.tsx
    new/page.tsx
    [id]/page.tsx
  components/product/
    product-list.tsx
    product-form.tsx
```

**Specifications :**
- CRUD complet avec pagination cursor-based
- Recherche par nom, reference, categorie
- Taux de TVA : 20% (defaut), 10%, 5.5% (travaux renovation), 2.1%
- Prix toujours en centimes (R02)
- Import CSV : `POST /api/products/import` (pour catalogues fournisseurs)
- // BUSINESS RULE [CDC-2.1]: Bibliotheque d'ouvrages avec mise a jour prix

**Tests requis :**
- Test CRUD produits
- Test calcul TVA avec tous les taux (20%, 10%, 5.5%, 2.1%)
- Test import CSV
- Test validation (prix negatif, taux invalide)

---

## Prompt 3.1 — Authentification JWT + 2FA ✅

Lis les skills 010 (auth-jwt), 011 (auth-2fa), 035 (data-encryption).

Implemente le systeme d'authentification complet.

**Fichiers a creer :**
```
apps/api/src/modules/auth/
  auth.routes.ts
  auth.service.ts
  auth.schemas.ts
  jwt.ts                    # Generation/verification JWT
  totp.ts                   # TOTP 2FA
  password.ts               # Hashing argon2
  __tests__/
    auth.service.test.ts
    auth.routes.test.ts
    jwt.test.ts
    totp.test.ts
apps/web/src/
  app/(auth)/
    login/page.tsx           # Page login complete
    register/page.tsx        # Page inscription complete
    verify-2fa/page.tsx      # Page verification 2FA
  lib/
    auth-context.tsx         # Update avec vrais appels API
    use-auth.ts              # Hook authentification
```

**Specifications :**
- `POST /api/auth/register` : inscription (email, password, nom entreprise)
  - Hash password avec argon2
  - Cree Tenant + User (role: owner)
  - Retourne access_token + refresh_token
- `POST /api/auth/login` : connexion
  - Verifie password
  - Si 2FA active → retourne `requires_2fa: true` + temporary_token
  - Sinon → retourne access_token + refresh_token
- `POST /api/auth/verify-2fa` : verification code TOTP
- `POST /api/auth/refresh` : renouvellement access_token
- `POST /api/auth/logout` : invalidation refresh_token
- `POST /api/auth/2fa/enable` : active 2FA (retourne QR code)
- `POST /api/auth/2fa/disable` : desactive 2FA (requiert code)
- Access token : JWT, expire 15min, contient `{ user_id, tenant_id, role }`
- Refresh token : opaque, stocke en DB, expire 7 jours
- // BUSINESS RULE [CDC-6]: Double authentification (2FA) obligatoire

**Tests requis :**
- Test inscription complete
- Test login (avec et sans 2FA)
- Test refresh token
- Test JWT (expiration, invalidation)
- Test TOTP (generation, verification)
- Test password hashing

---

## Prompt 3.2 — Autorisation RBAC et RLS ✅

Lis les skills 012 (rbac), 013 (rls-policies), 034 (audit-trail).

Implemente le controle d'acces et l'audit trail.

**Fichiers a creer :**
```
apps/api/src/
  modules/auth/
    rbac.ts                  # Systeme de roles et permissions
    policies.ts              # Policies par ressource
    __tests__/
      rbac.test.ts
  plugins/
    auth.ts                  # Update : verifier permissions
    tenant.ts                # Update : injecter tenant_id via RLS
  modules/audit/
    audit.service.ts         # Enregistrement actions
    audit.routes.ts          # Consultation journal audit
    __tests__/
      audit.test.ts
packages/db/prisma/
  schema.prisma              # Ajouter AuditLog + RefreshToken
  migrations/                # Migration correspondante
```

**Schema a ajouter :**
```prisma
model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id   String   @db.Uuid
  user_id     String   @db.Uuid
  action      String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  entity_type String   // Client, Invoice, etc.
  entity_id   String?  @db.Uuid
  old_values  Json?
  new_values  Json?
  ip_address  String?
  user_agent  String?
  created_at  DateTime @default(now())
}

model RefreshToken {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id     String   @db.Uuid
  token_hash  String   @unique
  expires_at  DateTime
  revoked_at  DateTime?
  created_at  DateTime @default(now())
  
  user        User     @relation(fields: [user_id], references: [id])
}
```

**Roles et permissions :**
```
owner    : tout (CRUD all, settings, billing, users)
admin    : tout sauf billing et suppression tenant
member   : CRUD sur ventes, achats, clients, produits (pas users ni settings)
accountant : lecture seule + export FEC
```

**Tests requis :**
- Test chaque role peut/ne peut pas effectuer chaque action
- Test RLS : un tenant ne voit jamais les donnees d'un autre
- Test audit log : chaque mutation est tracee
- Test isolation multi-tenant complete

---

## Prompt 4.1 — Editeur de Devis ✅

Lis les skills 002 (cents-money), 036 (tva-calculator), 037 (document-numbering).

Implemente l'editeur de devis dynamique.

**Schema Prisma :**
```prisma
model Quote {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id         String    @db.Uuid
  client_id         String    @db.Uuid
  number            String    // DEV-2026-00001
  status            String    @default("draft") // draft, sent, viewed, signed, refused, expired
  title             String?
  description       String?
  issue_date        DateTime  @default(now())
  validity_date     DateTime  // Date d'expiration
  deposit_rate      Int?      // Taux acompte en basis points (3000 = 30%)
  discount_type     String?   // percentage, fixed
  discount_value    Int?      // Centimes ou basis points selon type
  notes             String?   // Conditions particulieres
  total_ht_cents    Int       @default(0)
  total_tva_cents   Int       @default(0)
  total_ttc_cents   Int       @default(0)
  signed_at         DateTime?
  signature_data    Json?     // Donnees signature eIDAS
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  deleted_at        DateTime?

  tenant            Tenant    @relation(fields: [tenant_id], references: [id])
  client            Client    @relation(fields: [client_id], references: [id])
  lines             QuoteLine[]
  invoices          Invoice[]
}

model QuoteLine {
  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  quote_id          String  @db.Uuid
  product_id        String? @db.Uuid
  position          Int     // Ordre d'affichage
  type              String  @default("line") // line, section, subtotal, comment
  label             String
  description       String?
  quantity          Decimal @db.Decimal(10, 3)
  unit              String  @default("unit")
  unit_price_cents  Int     @default(0)
  tva_rate          Int     @default(2000)
  discount_type     String? // percentage, fixed
  discount_value    Int?
  total_ht_cents    Int     @default(0)
  
  quote             Quote   @relation(fields: [quote_id], references: [id], onDelete: Cascade)
}
```

**Fichiers a creer :**
```
apps/api/src/modules/quote/
  quote.routes.ts
  quote.service.ts
  quote.schemas.ts
  quote-calculator.ts        # Calcul totaux avec TVA multi-taux
  document-number.ts         # Generation numeros sequentiels
  __tests__/
    quote.service.test.ts
    quote-calculator.test.ts
    document-number.test.ts
apps/web/src/
  app/(dashboard)/quotes/
    page.tsx                  # Liste des devis
    new/page.tsx              # Creation devis
    [id]/page.tsx             # Edition devis
    [id]/preview/page.tsx     # Preview PDF
  components/quote/
    quote-editor.tsx          # Editeur de lignes drag & drop
    quote-line-row.tsx        # Ligne individuelle
    quote-totals.tsx          # Recapitulatif TVA multi-taux
    quote-client-select.tsx   # Selecteur client
```

**Specifications calculs :**
```
// BUSINESS RULE [CDC-2.1]: Calcul marge brute en temps reel
// BUSINESS RULE [CDC-2.1]: Gestion TVA multi-taux (20%, 10%, 5.5%) sur un meme document

Pour chaque ligne :
  total_ht = quantity * unit_price_cents - discount
  tva = round(total_ht * tva_rate / 10000)
  total_ttc = total_ht + tva

Recapitulatif TVA :
  Grouper par taux de TVA
  Pour chaque groupe : somme HT, somme TVA, somme TTC

Numerotation : DEV-{ANNEE}-{SEQUENCE:5} (ex: DEV-2026-00001)
  Sequence par tenant, par annee, sans trou
```

**Tests requis :**
- Test calcul totaux simples
- Test TVA multi-taux (devis avec lignes a 20%, 10%, 5.5%)
- Test numerotation sequentielle
- Test CRUD complet devis + lignes
- Test arrondi (pas de centimes perdus)
- Test discount (% et fixe)

---

## Prompt 4.2 — Workflow Devis (Envoi, Tracking, Signature) ✅

Lis les skills 017 (email-send), 031 (signature-electronique), 038 (workflow-engine).

Implemente le workflow de validation des devis.

**Fichiers a creer :**
```
apps/api/src/modules/quote/
  quote-workflow.ts          # Machine a etats du devis
  quote-share.ts             # Generation lien securise
  quote-tracking.ts          # Tracking ouverture
  __tests__/
    quote-workflow.test.ts
    quote-share.test.ts
apps/api/src/lib/
  email.ts                   # Service envoi email (Resend/Nodemailer)
  email-templates/
    quote-sent.ts            # Template "Nouveau devis"
    quote-reminder.ts        # Template relance
apps/web/src/
  app/
    share/
      quote/[token]/page.tsx # Page publique vue devis client
  components/quote/
    quote-status-badge.tsx
    quote-actions.tsx        # Boutons d'actions selon statut
    quote-timeline.tsx       # Historique du devis
```

**Machine a etats :**
```
draft → sent (action: envoyer)
sent → viewed (auto: client ouvre le lien)
viewed → signed (action: client signe)
viewed → refused (action: client refuse)
sent → expired (auto: date validite depassee)
signed → invoiced (auto: facture generee)
```

**Specifications :**
- `POST /api/quotes/:id/send` : genere un token unique, envoie email avec lien securise
- `GET /api/share/quote/:token` : page publique (pas d'auth requise), marque comme "viewed"
  - // BUSINESS RULE [CDC-2.1]: Tracking "Le client a ouvert le devis"
- `POST /api/share/quote/:token/sign` : signature electronique simplifiee
  - // BUSINESS RULE [CDC-2.1]: Signature electronique integree (eIDAS)
  - Capture : nom, prenom, IP, user-agent, date, signature canvas
- `POST /api/quotes/:id/duplicate` : dupliquer un devis
- Envoi email via Resend (ou SMTP configurable)

**Tests requis :**
- Test machine a etats (toutes les transitions valides et invalides)
- Test generation token securise
- Test tracking ouverture
- Test envoi email (mock)

---

## Prompt 4.3 — Generation Factures ✅

Lis les skills 002 (cents-money), 015 (pdf-generation), 037 (document-numbering).

Implemente la generation de factures.

**Schema Prisma :**
```prisma
model Invoice {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id         String    @db.Uuid
  client_id         String    @db.Uuid
  quote_id          String?   @db.Uuid
  number            String    // FAC-2026-00001
  type              String    @default("standard") // standard, deposit, credit_note, situation
  status            String    @default("draft") // draft, finalized, sent, paid, partially_paid, overdue, cancelled
  issue_date        DateTime  @default(now())
  due_date          DateTime
  deposit_percent   Int?      // Pour facture d'acompte (basis points)
  situation_percent Int?      // Pour situation de travaux (basis points)
  previous_situation_cents Int? // Montant deja facture
  payment_terms     Int       @default(30)
  notes             String?
  total_ht_cents    Int       @default(0)
  total_tva_cents   Int       @default(0)
  total_ttc_cents   Int       @default(0)
  paid_cents        Int       @default(0) // Montant deja paye
  remaining_cents   Int       @default(0) // Reste a payer
  finalized_at      DateTime?
  paid_at           DateTime?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  deleted_at        DateTime?

  tenant            Tenant    @relation(fields: [tenant_id], references: [id])
  client            Client    @relation(fields: [client_id], references: [id])
  quote             Quote?    @relation(fields: [quote_id], references: [id])
  lines             InvoiceLine[]
  payments          Payment[]
}

model InvoiceLine {
  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoice_id        String  @db.Uuid
  position          Int
  label             String
  description       String?
  quantity          Decimal @db.Decimal(10, 3)
  unit              String  @default("unit")
  unit_price_cents  Int     @default(0)
  tva_rate          Int     @default(2000)
  total_ht_cents    Int     @default(0)
  
  invoice           Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
}

model Payment {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String   @db.Uuid
  invoice_id      String   @db.Uuid
  amount_cents    Int
  payment_date    DateTime
  payment_method  String   // bank_transfer, card, cash, check
  reference       String?
  notes           String?
  created_at      DateTime @default(now())
  
  invoice         Invoice  @relation(fields: [invoice_id], references: [id])
}
```

**Fichiers a creer :**
```
apps/api/src/modules/invoice/
  invoice.routes.ts
  invoice.service.ts
  invoice.schemas.ts
  invoice-calculator.ts
  invoice-pdf.ts             # Generation PDF
  __tests__/
    invoice.service.test.ts
    invoice-calculator.test.ts
    invoice-pdf.test.ts
apps/api/src/modules/payment/
  payment.routes.ts
  payment.service.ts
  payment.schemas.ts
  __tests__/
    payment.service.test.ts
apps/web/src/
  app/(dashboard)/invoices/
    page.tsx
    new/page.tsx
    [id]/page.tsx
    [id]/pdf/page.tsx
  components/invoice/
    invoice-list.tsx
    invoice-form.tsx
    invoice-pdf-preview.tsx
    payment-form.tsx
    payment-list.tsx
```

**Specifications :**
- `POST /api/invoices` : creation directe ou depuis un devis signe
  - // BUSINESS RULE [CDC-2.1]: Generation automatique facture d'acompte (30%) des la signature
- `POST /api/invoices/:id/finalize` : fige la facture (plus modifiable)
- `POST /api/invoices/:id/payments` : enregistrer un paiement
  - Met a jour `paid_cents` et `remaining_cents`
  - Si `paid_cents >= total_ttc_cents` → status = "paid"
- Numerotation : FAC-{ANNEE}-{SEQUENCE:5} (sequentielle, sans trou, immuable apres finalisation)
- Generation PDF avec :
  - En-tete entreprise (logo, coordonnees)
  - Infos client
  - Tableau des lignes avec totaux
  - Recapitulatif TVA
  - Conditions de paiement
  - Mentions legales obligatoires

**Tests requis :**
- Test creation facture depuis devis
- Test facture d'acompte (30%)
- Test enregistrement paiement partiel et total
- Test numerotation immuable
- Test calculs (identiques a devis)
- Test generation PDF (verifie que le fichier est cree)

---

## Prompt 4.4 — Generation Factur-X ✅

Lis les skills 016 (facturx-xml), 015 (pdf-generation).

Implemente la generation de factures au format Factur-X (PDF/A-3 + XML embarque).

**Fichiers a creer :**
```
apps/api/src/modules/invoice/
  facturx/
    facturx-generator.ts     # Orchestrateur generation Factur-X
    facturx-xml.ts           # Generation XML CII (Cross Industry Invoice)
    facturx-pdf.ts           # Embedding XML dans PDF/A-3
    facturx-validator.ts     # Validation conformite
    __tests__/
      facturx-xml.test.ts
      facturx-validator.test.ts
      facturx-generator.test.ts
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.1]: Generation native Factur-X (PDF/A-3 + XML)
// BUSINESS RULE [CDC-2.1]: Conformite reforme facturation electronique 2026

Profil : Factur-X MINIMUM ou BASIC (suffisant pour TPE)

XML CII (CrossIndustryInvoice) doit contenir :
- ExchangedDocumentContext (profil Factur-X)
- ExchangedDocument (numero, date, type)
- SupplyChainTradeTransaction :
  - ApplicableHeaderTradeAgreement (vendeur, acheteur avec SIRET)
  - ApplicableHeaderTradeDelivery
  - ApplicableHeaderTradeSettlement :
    - Devise (EUR)
    - ApplicableTradeTax (par taux de TVA)
    - SpecifiedTradePaymentTerms
    - SpecifiedTradeSettlementHeaderMonetarySummation (totaux)

PDF/A-3 :
- Embarquer le XML en piece jointe PDF (AF relationship)
- Metadata XMP avec reference au fichier XML
```

**Tests requis :**
- Test generation XML valide pour une facture simple
- Test XML avec TVA multi-taux
- Test XML facture d'acompte
- Test validation structure XML
- Test embedding dans PDF/A-3
- Test avec des montants limites (0, tres grands)

---

## Prompt 4.5 — Situations de Travaux ✅

Lis les skills 002 (cents-money), 036 (tva-calculator).

Implemente la facturation par situations de travaux.

**Fichiers a creer :**
```
apps/api/src/modules/invoice/
  situation.service.ts       # Logique situations de travaux
  situation.routes.ts        # Routes specifiques
  __tests__/
    situation.test.ts
apps/web/src/
  components/invoice/
    situation-editor.tsx     # Interface avancement par ligne
    situation-summary.tsx    # Resume cumulatif
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.1]: Situations de travaux - facturer l'avancement d'un chantier
// BUSINESS RULE [CDC-2.1]: Calcul automatique du reste a facturer

Une situation de travaux permet de facturer un % d'avancement :
- Lie a un devis signe (le devis est le "marche")
- Chaque situation N represente l'avancement cumule
- La facture = avancement cumule - deja facture

Exemple :
  Devis : 10 000 EUR HT
  Situation 1 : 30% → Facture : 3 000 EUR
  Situation 2 : 60% → Facture : 6 000 - 3 000 = 3 000 EUR
  Situation 3 : 100% → Facture : 10 000 - 6 000 = 4 000 EUR

L'avancement peut etre global (% du devis) ou par ligne (% de chaque ligne)
```

**API :**
- `POST /api/quotes/:id/situations` : creer une nouvelle situation
- `GET /api/quotes/:id/situations` : historique des situations
- `PATCH /api/situations/:id` : modifier l'avancement (tant que non finalisee)

**Tests requis :**
- Test avancement global (30%, 60%, 100%)
- Test avancement par ligne
- Test qu'on ne peut pas depasser 100%
- Test calcul "reste a facturer" correct
- Test avec TVA multi-taux sur les lignes

---

## Prompt 4.6 — Suivi Paiements et Relances ✅

Lis les skills 032 (cron-scheduler), 033 (notification-system), 017 (email-send).

Implemente le suivi des paiements et les relances automatiques.

**Fichiers a creer :**
```
apps/api/src/modules/invoice/
  reminder.service.ts        # Logique de relance
  reminder.scheduler.ts      # Job CRON relances
  __tests__/
    reminder.test.ts
apps/api/src/lib/
  email-templates/
    payment-reminder-1.ts   # Relance 1 (date echeance)
    payment-reminder-2.ts   # Relance 2 (J+7)
    payment-reminder-3.ts   # Relance 3 (J+15, plus ferme)
    payment-received.ts     # Confirmation paiement
apps/web/src/
  app/(dashboard)/invoices/
    overdue/page.tsx         # Liste factures en retard
  components/invoice/
    payment-status.tsx       # Indicateur visuel paiement
    reminder-history.tsx     # Historique des relances
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.1]: Module de relance automatique intelligent

Sequence de relance :
1. J-3 avant echeance : rappel amical "Votre facture arrive a echeance"
2. J+1 apres echeance : "Votre facture est arrivee a echeance"  
3. J+7 : relance formelle
4. J+15 : relance ferme avec mention des penalites de retard
5. J+30 : derniere relance avant contentieux

Penalites de retard :
- Taux BCE + 10 points (ou 3x taux legal si superieur)
- Indemnite forfaitaire de 40 EUR pour frais de recouvrement
```

**Tests requis :**
- Test detection factures en retard
- Test sequence de relance (J-3, J+1, J+7, J+15, J+30)
- Test calcul penalites de retard
- Test qu'une facture payee ne recoit plus de relance
- Test envoi email (mock)

---

## Prompt 5.1 — Module Achats : Factures Fournisseurs ✅

Lis les skills 002 (cents-money), 005 (zod-validation), 028 (sepa-generator).

Implemente le module de gestion des achats.

**Schema Prisma :**
```prisma
model Supplier {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String   @db.Uuid
  name            String
  siret           String?
  email           String?
  phone           String?
  address         Json?
  iban            String?
  bic             String?
  payment_terms   Int      @default(30)
  category        String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  deleted_at      DateTime?

  tenant          Tenant   @relation(fields: [tenant_id], references: [id])
  purchases       Purchase[]
}

model Purchase {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id         String    @db.Uuid
  supplier_id       String?   @db.Uuid
  number            String?   // Numero facture fournisseur
  status            String    @default("pending") // pending, validated, paid, disputed
  source            String    @default("manual") // manual, ocr, email, connector
  issue_date        DateTime?
  due_date          DateTime?
  total_ht_cents    Int       @default(0)
  total_tva_cents   Int       @default(0)
  total_ttc_cents   Int       @default(0)
  paid_cents        Int       @default(0)
  category          String?
  notes             String?
  document_url      String?   // URL du document original
  ocr_data          Json?     // Donnees extraites par OCR
  ocr_confidence    Float?    // Score de confiance OCR
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  deleted_at        DateTime?

  tenant            Tenant    @relation(fields: [tenant_id], references: [id])
  supplier          Supplier? @relation(fields: [supplier_id], references: [id])
  lines             PurchaseLine[]
}

model PurchaseLine {
  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  purchase_id       String  @db.Uuid
  position          Int
  label             String
  quantity          Decimal @db.Decimal(10, 3)
  unit_price_cents  Int     @default(0)
  tva_rate          Int     @default(2000)
  total_ht_cents    Int     @default(0)
  
  purchase          Purchase @relation(fields: [purchase_id], references: [id], onDelete: Cascade)
}
```

**Fichiers a creer :**
```
apps/api/src/modules/supplier/
  supplier.routes.ts
  supplier.service.ts
  supplier.schemas.ts
  __tests__/
    supplier.service.test.ts
apps/api/src/modules/purchase/
  purchase.routes.ts
  purchase.service.ts
  purchase.schemas.ts
  sepa-generator.ts          # Generation fichier SEPA XML
  __tests__/
    purchase.service.test.ts
    sepa-generator.test.ts
apps/web/src/
  app/(dashboard)/
    purchases/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    suppliers/
      page.tsx
      [id]/page.tsx
  components/purchase/
    purchase-list.tsx
    purchase-form.tsx
    purchase-validation.tsx
    supplier-select.tsx
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.2]: Visualisation factures d'achats a payer
// BUSINESS RULE [CDC-2.2]: Initialisation virement SEPA via API bancaire

- CRUD Fournisseurs avec IBAN/BIC
- CRUD Achats avec lignes
- Generation fichier SEPA XML (pain.001) pour paiement fournisseurs
- Dashboard achats : factures a payer cette semaine, ce mois
- Statut paiement : pending → validated → paid
```

**Tests requis :**
- Test CRUD fournisseurs et achats
- Test generation SEPA XML valide
- Test calculs TVA achats
- Test workflow de validation

---

## Prompt 5.2 — OCR et Extraction Donnees ✅

Lis les skills 023 (ocr-pipeline), 014 (file-upload).

Implemente le service OCR pour extraction de donnees sur factures.

**Fichiers a creer :**
```
apps/ocr/
  requirements.txt
  main.py                    # FastAPI app
  config.py                  # Configuration
  routers/
    extract.py               # POST /extract endpoint
  services/
    ocr_engine.py            # Pipeline OCR
    document_classifier.py   # Classification type document
    field_extractor.py       # Extraction champs structures
    confidence_scorer.py     # Score de confiance
  models/
    schemas.py               # Pydantic schemas
  tests/
    test_extract.py
    test_field_extractor.py
    conftest.py
apps/api/src/modules/purchase/
  ocr-client.ts              # Client API vers service OCR
  __tests__/
    ocr-client.test.ts
apps/web/src/
  components/purchase/
    ocr-upload.tsx           # Upload + preview extraction
    ocr-review.tsx           # Review/correction donnees extraites
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.2]: OCR Mobile (V-IA) - scanner tickets de caisse
// BUSINESS RULE [CDC-2.2]: L'IA doit extraire : Nom fournisseur, Date, HT, TVA (multi-taux), TTC

Pipeline OCR :
1. Reception image/PDF
2. Pre-traitement (rotation, contraste, denoising)
3. OCR avec Tesseract ou EasyOCR (fallback)
4. Classification document (facture, ticket, avoir)
5. Extraction champs :
   - supplier_name
   - invoice_number
   - invoice_date
   - due_date
   - lines[] (label, quantity, unit_price, tva_rate, total)
   - total_ht, total_tva (par taux), total_ttc
6. Score de confiance par champ (0.0 - 1.0)
7. Retour JSON structure

Endpoint : POST /extract
  Input : multipart/form-data (image ou PDF)
  Output : { fields: {...}, confidence: 0.85, lines: [...] }
```

**Tests requis :**
- Test extraction sur facture type (mock OCR)
- Test classification document
- Test score de confiance
- Test gestion erreurs (image illisible, PDF corrompu)
- Test multi-taux TVA sur un ticket

---

## Prompt 5.3 — Parsing Email Automatique ✅

Lis les skills 065 (email-parser), 019 (queue-job).

Implemente la detection automatique de factures dans les emails.

**Fichiers a creer :**
```
apps/api/src/modules/purchase/
  email-parser/
    email-scanner.ts         # Connexion IMAP + scan
    attachment-detector.ts   # Detection pieces jointes "facture"
    email-processor.ts       # Traitement pipeline
    __tests__/
      email-scanner.test.ts
      attachment-detector.test.ts
apps/api/src/jobs/
  email-scan.job.ts          # Job periodique scan emails
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.2]: Parsing d'Email - Detection automatique des pieces jointes "Facture"

1. Connexion IMAP a la boite mail pro de l'utilisateur
2. Scan periodique (toutes les 15min) des nouveaux emails
3. Detection des pieces jointes qui ressemblent a des factures :
   - Nom fichier contient : facture, invoice, fac_, avoir
   - Type MIME : application/pdf, image/jpeg, image/png
   - Expediteur connu (dans la liste fournisseurs)
4. Pour chaque piece jointe detectee :
   - Telecharger la piece jointe
   - Envoyer au service OCR
   - Creer un Purchase en status "pending" avec les donnees extraites
   - Notifier l'utilisateur pour validation
5. Marquer l'email comme traite (label/flag)
```

**Tests requis :**
- Test detection pieces jointes (noms de fichiers variees)
- Test filtrage MIME types
- Test pipeline complet (mock IMAP + mock OCR)
- Test gestion emails deja traites (pas de doublons)

---

## Prompt 5.4 — Connecteurs Fournisseurs ✅

Lis les skills 064 (supplier-scraper), 019 (queue-job), 022 (api-client).

Implemente les connecteurs de recuperation automatique de factures fournisseurs.

**Fichiers a creer :**
```
apps/api/src/modules/purchase/
  connectors/
    connector-base.ts        # Interface de base pour tous les connecteurs
    connector-registry.ts    # Registre des connecteurs disponibles
    amazon.ts               # Connecteur Amazon Business
    edf.ts                  # Connecteur EDF
    orange.ts               # Connecteur Orange
    generic-portal.ts       # Connecteur generique (configurable)
    __tests__/
      connector-base.test.ts
      connector-registry.test.ts
apps/api/src/jobs/
  supplier-sync.job.ts      # Job synchronisation fournisseurs
apps/web/src/
  app/(dashboard)/
    settings/
      connectors/
        page.tsx             # Configuration connecteurs
  components/settings/
    connector-card.tsx
    connector-setup.tsx
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.2]: Recuperation automatique des factures sur les portails fournisseurs
// BUSINESS RULE [CDC-2.2]: Connecteurs : Amazon, EDF, Orange, Leroy Merlin, Point P

Interface ConnectorBase :
  - authenticate(credentials: encrypted): Promise<Result<Session>>
  - fetchInvoices(since: Date): Promise<Result<RawInvoice[]>>
  - downloadDocument(id: string): Promise<Result<Buffer>>

Chaque connecteur :
  - Stockage credentials chiffre AES-256
  - Sync periodique (quotidien ou configurable)
  - Gestion des erreurs (retry avec backoff)
  - Rate limiting respectueux du portail source
```

**Tests requis :**
- Test interface ConnectorBase
- Test registre des connecteurs
- Test retry avec backoff
- Test chiffrement credentials

---

## Prompt 6.1 — Connexion Bancaire Open Banking ✅

Lis les skills 024 (bank-sync), 060 (openbanking-client), 018 (webhook-handler).

Implemente la connexion bancaire via Open Banking (DSP2).

**Schema Prisma :**
```prisma
model BankAccount {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String    @db.Uuid
  provider_id     String?   // ID chez Bridge/Powens
  bank_name       String
  account_name    String?
  iban            String?
  bic             String?
  balance_cents   Int       @default(0)
  currency        String    @default("EUR")
  last_sync_at    DateTime?
  status          String    @default("active") // active, error, disconnected
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  deleted_at      DateTime?

  tenant          Tenant    @relation(fields: [tenant_id], references: [id])
  transactions    BankTransaction[]
}

model BankTransaction {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id       String    @db.Uuid
  bank_account_id String    @db.Uuid
  provider_id     String?   // ID chez le provider
  date            DateTime
  value_date      DateTime?
  amount_cents    Int
  currency        String    @default("EUR")
  label           String
  raw_label       String?   // Label brut de la banque
  category        String?
  type            String?   // credit, debit
  matched         Boolean   @default(false)
  invoice_id      String?   @db.Uuid
  purchase_id     String?   @db.Uuid
  created_at      DateTime  @default(now())
  
  bank_account    BankAccount @relation(fields: [bank_account_id], references: [id])
}
```

**Fichiers a creer :**
```
apps/api/src/modules/bank/
  bank.routes.ts
  bank.service.ts
  bank.schemas.ts
  bridge-client.ts           # Client API Bridge
  sync.service.ts            # Synchronisation transactions
  __tests__/
    bank.service.test.ts
    bridge-client.test.ts
    sync.test.ts
apps/api/src/jobs/
  bank-sync.job.ts           # Job sync periodique
apps/web/src/
  app/(dashboard)/bank/
    page.tsx                  # Vue compte bancaire
    connect/page.tsx          # Flow connexion bancaire
    [id]/page.tsx             # Detail compte
  components/bank/
    bank-account-card.tsx
    transaction-list.tsx
    balance-chart.tsx
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.3]: Synchronisation temps reel via DSP2 (Bridge/Powens)
// BUSINESS RULE [CDC-2.3]: Connexion a 300+ banques

- Integration Bridge API (ou Powens) :
  - Initier connexion (redirect vers widget Bridge)
  - Webhook pour notification nouvelles transactions
  - Sync quotidien des transactions
  - Recuperation solde en temps reel

- Chaque transaction synchronisee est stockee avec le label brut
- Auto-categorisation basique (loyer, assurance, telecom, etc.)
```

**Tests requis :**
- Test client Bridge API (mock)
- Test synchronisation transactions
- Test webhook handler
- Test auto-categorisation
- Test gestion deconnexion/reconnexion

---

## Prompt 6.2 — Rapprochement Bancaire ✅

Lis les skills 025 (matching-algo), 021 (cache-layer).

Implemente l'algorithme de rapprochement bancaire automatique.

**Fichiers a creer :**
```
apps/api/src/modules/bank/
  matching/
    matcher.ts               # Algorithme principal
    rules.ts                 # Regles de matching
    scorer.ts                # Scoring de correspondance
    __tests__/
      matcher.test.ts
      scorer.test.ts
apps/web/src/
  app/(dashboard)/bank/
    reconciliation/page.tsx  # Interface rapprochement
  components/bank/
    match-suggestion.tsx     # Suggestion de rapprochement
    manual-match.tsx         # Rapprochement manuel
    unmatched-list.tsx       # Transactions non rapprochees
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.3]: Auto-Matching entre mouvements bancaires et documents

Algorithme de matching multi-criteres :
1. Match exact montant (tolerance 0) :
   - Transaction +1500.00 ↔ Facture emise 1500.00 TTC
   - Transaction -850.00 ↔ Facture fournisseur 850.00 TTC
2. Match par reference :
   - Le label de la transaction contient le numero de facture
3. Match par client/fournisseur :
   - Le label contient le nom d'un client/fournisseur connu
4. Match temporel :
   - Date transaction proche de la date d'echeance (±5 jours)

Score de confiance :
  - Match exact montant + reference : 100% → auto-match
  - Match exact montant + client : 90% → suggestion
  - Match montant seul : 60% → suggestion
  - Match partiel : suggestion avec details

Interface :
  - Liste des transactions non rapprochees
  - Suggestions de rapprochement avec score
  - Validation en 1 clic
  - Rapprochement manuel (drag & drop)
```

**Tests requis :**
- Test match exact (montant + reference)
- Test match partiel (montant seul)
- Test scoring de confiance
- Test qu'un document ne peut etre matche qu'une fois
- Test avec multiples suggestions

---

## Prompt 6.3 — Previsionnel de Tresorerie ✅

Lis les skills 026 (forecast-engine), 066 (ml-prediction).

Implemente le previsionnel de tresorerie.

**Fichiers a creer :**
```
apps/api/src/modules/bank/
  forecast/
    forecast.service.ts      # Moteur previsionnel
    forecast.routes.ts       # API previsionnel
    recurrence-detector.ts   # Detection charges recurrentes
    __tests__/
      forecast.test.ts
      recurrence-detector.test.ts
apps/web/src/
  app/(dashboard)/bank/
    forecast/page.tsx        # Vue previsionnel
  components/bank/
    forecast-chart.tsx       # Graphique previsionnel
    forecast-alert.tsx       # Alerte solde negatif
    cash-flow-table.tsx      # Tableau flux de tresorerie
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.3]: Previsionnel de tresorerie
// BUSINESS RULE [CDC-2.3]: Formule : Solde actuel + Encaissements prevus - Decaissements prevus
// BUSINESS RULE [CDC-2.3]: Alerte si solde previsionnel negatif a 30 jours

Calcul previsionnel :
  Solde J = Solde actuel
  Pour chaque jour J+1 à J+90 :
    + Factures emises dont echeance = J (remaining_cents)
    - Factures fournisseurs dont echeance = J (remaining_cents)
    - Charges recurrentes detectees (loyer, assurance, abonnements)
    = Solde previsionnel J

Detection charges recurrentes :
  Analyser les 6 derniers mois de transactions
  Detecter les patterns (meme montant, meme periode, meme fournisseur)
  Projeter sur les 3 prochains mois

Alertes :
  - Solde previsionnel < 0 a J+30 : alerte orange
  - Solde previsionnel < 0 a J+7 : alerte rouge
  - Notification email si alerte rouge
```

**Tests requis :**
- Test calcul previsionnel simple
- Test avec factures multi-echeances
- Test detection charges recurrentes
- Test alerte seuil negatif
- Test sur 90 jours

---

## Prompt 7.1 — Generateur DUERP ✅

Lis les skills 061 (duerp-generator) et 805 (expert-duerp-securite).

Implemente le generateur de DUERP (Document Unique d'Evaluation des Risques Professionnels) conforme aux articles R4121-1 a R4121-4 du Code du travail. Obligatoire des le 1er salarie, conservation 40 ans (loi 2021-1018 du 2 aout 2021), amende 1 500 EUR en cas d'absence.

**Benchmark** : d-u-e-r-p.fr (SaaS mono-produit, 161 metiers, wizard 6 etapes, 129-289 EUR one-shot). Notre avantage : integration native (donnees pre-remplies depuis le profil tenant), couverture complete (73 profils NAF couvrant tous les secteurs 01-99), modele recurrent (inclus abonnement).

> **Etat implementation** : Base de risques complete avec 73 profils NAF couvrant tous les secteurs francais (A-U). Chaque profil inclut des risques specifiques au secteur + 6 risques communs (routier, psychosocial, biologique, incendie, chute de plain-pied, electrique). L'API `/api/legal/duerp/risks/:nafCode` renvoie les risques par code NAF. Frontend fonctionnel avec chargement dynamique des risques.

**Fichiers a creer :**
```
apps/api/src/modules/legal/
  duerp/
    duerp.service.ts          # CRUD DUERP + versioning (v1 → v2 → v3...)
    duerp.routes.ts           # Routes REST DUERP
    duerp.schemas.ts          # Schemas Zod validation
    risk-database.ts          # Base de risques par code NAF — 18 metiers BTP en profondeur
    risk-database.data.ts     # Donnees risques : 12 risques communs BTP + specifiques par metier
    work-units.ts             # Unites de travail dynamiques par chantier
    scoring.ts                # Matrice gravite(1-4) x frequence(1-4), niveaux faible/modere/eleve/critique
    duerp-pdf.ts              # Generation PDF HTML conforme (structure 7 sections obligatoires)
    duerp-archive.ts          # Archivage GCS bucket ARCHIVE, retention policy 40 ans locked
    duerp-triggers.ts         # Detection intelligente : achats chimiques, equipements, nouveau salarie
    __tests__/
      duerp.test.ts
      risk-database.test.ts
      scoring.test.ts
      work-units.test.ts
      duerp-triggers.test.ts
      duerp-archive.test.ts
apps/web/src/
  app/(dashboard)/legal/
    duerp/
      page.tsx                # Liste DUERP + versions + statut mise a jour
      wizard/page.tsx         # Wizard 5 etapes (identification → unites → risques → prevention → generation)
      [id]/page.tsx           # Detail version DUERP avec apercu PDF
  components/legal/
    duerp-wizard/
      step-identification.tsx  # Etape 1 : pre-rempli depuis profil tenant (SIRET, NAF, effectif)
      step-work-units.tsx      # Etape 2 : unites de travail proposees par metier + chantiers actifs
      step-risks.tsx           # Etape 3 : risques pre-coches par metier, ajustement gravite/frequence
      step-prevention.tsx      # Etape 4 : mesures existantes + actions correctives
      step-generate.tsx        # Etape 5 : apercu PDF + signature + archivage
    risk-matrix.tsx            # Matrice 4x4 visuelle avec code couleur (vert/jaune/orange/rouge)
    risk-form.tsx              # Formulaire ajout/edition risque personnalise
    duerp-preview.tsx          # Preview PDF inline
    duerp-version-list.tsx     # Historique des versions avec comparaison
    duerp-update-alert.tsx     # Banniere alerte mise a jour requise
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.4]: DUERP obligatoire des le 1er salarie (art. R4121-1 Code du travail)
// BUSINESS RULE [CDC-2.4]: Conservation 40 ans chaque version (loi 2021-1018)
// BUSINESS RULE [CDC-2.4]: Mise a jour annuelle obligatoire (>=11 salaries) ou lors changement significatif (<11)
// BUSINESS RULE [CDC-2.4]: DUERP dynamique base sur le code NAF/APE
// BUSINESS RULE [CDC-2.4]: Mise a jour suggeree si nouveau produit chimique detecte dans achats

1. STRUCTURE DUERP — 7 sections obligatoires :
   - Identification entreprise (SIRET, NAF, effectif, referent securite)
   - Unites de travail (groupement par zone/poste expose aux memes risques)
   - Inventaire des risques par unite (dangers identifies, sources)
   - Evaluation gravite x frequence (grille 4x4)
   - Mesures de prevention (hierarchie : supprimer → reduire → proteger → former)
   - Plan d'actions (PAPRIPACT si >=50 salaries)
   - Signatures et dates (employeur, CSE si applicable, date prochain audit)

2. BASE DE RISQUES par code NAF — profondeur BTP :
   a) 12 risques communs a tous metiers BTP :
      - Chutes de hauteur (G4×F3=12 Critique)
      - Chutes de plain-pied (G3×F4=12 Critique)
      - Manutention/TMS (G2×F4=8 Eleve)
      - Bruit (G2×F3=6 Eleve)
      - Vibrations (G2×F3=6 Eleve)
      - Risque routier (G4×F2=8 Eleve)
      - Conditions meteo (G2×F3=6 Eleve)
      - Produits chimiques (G3×F2=6 Eleve)
      - Poussieres/amiante (G4×F2=8 Eleve)
      - Risque electrique (G4×F2=8 Eleve)
      - Incendie/explosion (G4×F1=4 Modere)
      - RPS/stress (G2×F3=6 Eleve)

   b) Risques specifiques par metier (10 metiers prioritaires) :
      - Peintre batiment (43.34Z) : solvants/COV (G3×F3=9 Critique), poussieres poncage, TMS bras leves
      - Electricien (43.21A) : risque electrique (G4×F3=12 Critique), brulures arc
      - Plombier (43.22A) : amiante (G4×F2=8 Eleve), soudure, espaces confines, legionellose
      - Macon (43.99A) : chutes hauteur (Critique), manutention lourde, ciment (dermatite)
      - Menuisier (43.32A) : machines (scie, raboteuse), poussieres bois, colles/vernis
      - Couvreur (43.91A) : chutes hauteur (Critique max), intemperies, manutention toiture
      - Carreleur (43.33Z) : genoux/TMS (Critique), poussieres silice, produits chimiques
      - Charpentier (43.91B) : chutes hauteur, manutention bois lourd, machines portatives
      - Platrier (43.31Z) : poussieres platre, TMS bras leves, chutes echafaudage
      - Serrurier-metallier (25.11Z) : soudure, meulage, bruit, projections metalliques

   c) Autres secteurs (couverture de base) :
      - Restauration (56.xx) : brulure, coupure, glissade, TMS, RPS, allergenes
      - Commerce (47.xx) : TMS, agression, incendie, RPS

3. MATRICE SCORING 4x4 (gravite x frequence) :
   - Gravite : 1=Faible, 2=Moyenne, 3=Elevee, 4=Tres elevee
   - Frequence : 1=Occasionnelle, 2=Frequente, 3=Tres frequente, 4=Quotidienne
   - Score = Gravite × Frequence
   - Niveaux : Faible (1-3), Modere (4-5), Eleve (6-8), Critique (9-16)
   - Code couleur : vert / jaune / orange / rouge

4. UNITES DE TRAVAIL DYNAMIQUES (specificite BTP) :
   - Types : 'chantier' | 'atelier' | 'bureau' | 'vehicule' | 'stockage'
   - Par chantier : zone terrassement, zone gros oeuvre, zone finitions
   - Permanentes : atelier fixe, vehicules, bureau
   - Proposition automatique basee sur code NAF + chantiers actifs (depuis module projets si disponible)
   - Un nouveau chantier = nouvelles unites a evaluer
   - Un chantier termine = unites archivees

5. WIZARD 5 ETAPES (sans friction, donnees pre-remplies) :
   Etape 1 — Identification : pre-rempli depuis profil tenant (SIRET, NAF, effectif, adresse)
   Etape 2 — Unites de travail : proposees automatiquement par metier, l'artisan valide/ajoute
   Etape 3 — Evaluation risques : risques pre-coches par metier, ajustement gravite/frequence
   Etape 4 — Mesures prevention : actions pre-remplies, cocher existantes, proposer correctives
   Etape 5 — Generation et signature : apercu PDF, signature (nom+date+confirmation), archivage

6. DETECTION INTELLIGENTE (triggers mise a jour) :
   - Annuelle : notification M-1, M-0, J-7 avant date anniversaire
   - Nouveau salarie : quand un membre est ajoute a l'equipe
   - Achat produit chimique : detection via OCR/categorisation des achats (module 5.x)
   - Nouvel equipement : detection via categorie achat "outillage"
   - Accident du travail : si un evenement AT est declare
   - Changement de local : si l'adresse du tenant change

7. ARCHIVAGE 40 ANS (GCS) :
   - Bucket dedie : zenadmin-duerp-archive
   - Retention policy : 40 ans, locked (irreversible)
   - Storage class : ARCHIVE (cout minimal long terme)
   - Location : EU (conformite RGPD)
   - Chemin : gs://.../{tenantId}/{year}/duerp-v{version}.pdf + .json
   - Chaque version = nouveau fichier (jamais d'ecrasement)
   - Metadata : tenantId, version, createdAt, createdBy, hash SHA-256
   - Audit trail immutable

8. VERSIONING DUERP :
   - Chaque mise a jour cree une nouvelle version (v1 → v2 → v3...)
   - L'ancienne version reste accessible (archivee)
   - Processus : charger derniere version → pre-remplir modifications → valider → generer → archiver
   - Historique des versions consultable avec diff visuel

9. MESURES DE PREVENTION (hierarchie Code du travail) :
   Pour chaque risque identifie :
   - Mesures existantes (cochees par l'artisan)
   - Actions correctives proposees (pre-remplies par metier)
   - Responsable de mise en oeuvre
   - Delai de realisation
   - Hierarchie : 1) Supprimer le danger 2) Reduire par moyens techniques 3) Proteger par EPI 4) Former/informer
```

**Prisma schema :**
```prisma
model Duerp {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  version     Int      @default(1)
  status      String   @default("draft") // draft | signed | archived
  nafCode     String   @map("naf_code")
  companyName String   @map("company_name")
  siret       String
  employeeCount Int    @map("employee_count")
  safetyOfficer String? @map("safety_officer")
  signedAt    DateTime? @map("signed_at")
  signedBy    String?   @map("signed_by")
  nextAuditDate DateTime? @map("next_audit_date")
  pdfUrl      String?   @map("pdf_url")
  archiveUrl  String?   @map("archive_url")
  archiveHash String?   @map("archive_hash") // SHA-256
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  workUnits   DuerpWorkUnit[]
  risks       DuerpRisk[]

  @@map("duerps")
}

model DuerpWorkUnit {
  id          String   @id @default(uuid())
  duerpId     String   @map("duerp_id")
  name        String
  type        String   // chantier | atelier | bureau | vehicule | stockage
  location    String?
  employeeCount Int    @map("employee_count")
  employeeNames String[] @map("employee_names")
  isActive    Boolean  @default(true) @map("is_active")
  
  duerp       Duerp    @relation(fields: [duerpId], references: [id])
  risks       DuerpRisk[]

  @@map("duerp_work_units")
}

model DuerpRisk {
  id              String   @id @default(uuid())
  duerpId         String   @map("duerp_id")
  workUnitId      String?  @map("work_unit_id")
  riskName        String   @map("risk_name")
  description     String?
  severity        Int      // 1-4 (gravite)
  frequency       Int      // 1-4 (frequence)
  score           Int      // severity * frequency
  level           String   // faible | modere | eleve | critique
  existingMeasures String[] @map("existing_measures")
  correctiveActions String[] @map("corrective_actions")
  requiredPpe     String[] @map("required_ppe") // EPI requis
  responsible     String?
  deadline        DateTime?
  
  duerp           Duerp    @relation(fields: [duerpId], references: [id])
  workUnit        DuerpWorkUnit? @relation(fields: [workUnitId], references: [id])

  @@map("duerp_risks")
}
```

**Tests requis :**
- Test CRUD DUERP (creation, lecture, mise a jour, versioning v1→v2)
- Test base de risques par code NAF (43.34Z peintre, 43.21A electricien, etc.)
- Test scoring matrice 4×4 (calcul score, determination niveau faible/modere/eleve/critique)
- Test unites de travail dynamiques (creation par chantier, archivage, permanentes)
- Test detection intelligente (produit chimique dans achats → alerte, nouvel equipement → alerte)
- Test generation PDF conforme (7 sections obligatoires presentes)
- Test archivage GCS (upload, metadata SHA-256, retention policy)
- Test wizard pre-remplissage (donnees tenant injectees a l'etape 1)
- Test notifications mise a jour (annuelle M-1/M-0/J-7, nouveau salarie, AT)
- Test mesures prevention (hierarchie, actions correctives par risque)

---

## Prompt 7.2 — Registre RGPD ✅

Lis les skills 062 (rgpd-registry).

Implemente le registre RGPD.

**Fichiers a creer :**
```
apps/api/src/modules/legal/
  rgpd/
    rgpd.service.ts
    rgpd.routes.ts
    rgpd.schemas.ts
    __tests__/
      rgpd.test.ts
apps/web/src/
  app/(dashboard)/legal/
    rgpd/
      page.tsx               # Registre RGPD
      treatments/page.tsx    # Liste des traitements
  components/legal/
    treatment-form.tsx       # Formulaire traitement
    treatment-list.tsx       # Liste traitements
    rgpd-export.tsx          # Export registre
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.4]: Pre-remplissage du registre des donnees clients

Traitements pre-remplis pour une TPE :
1. Gestion de la relation client (fichier clients)
2. Facturation et comptabilite
3. Gestion des fournisseurs
4. Gestion du personnel (si salaries)
5. Prospection commerciale

Pour chaque traitement :
  - Finalite
  - Base legale (contrat, interet legitime, obligation legale)
  - Categories de donnees
  - Destinataires
  - Duree de conservation
  - Mesures de securite

Export au format standard CNIL
```

**Tests requis :**
- Test creation registre pre-rempli
- Test CRUD traitements
- Test export format CNIL

---

## Prompt 7.3 — Coffre-Fort Assurances ✅

Lis les skills 063 (insurance-vault), 032 (cron-scheduler), 033 (notification-system).

Implemente le coffre-fort numerique pour les assurances.

**Fichiers a creer :**
```
apps/api/src/modules/legal/
  insurance/
    insurance.service.ts
    insurance.routes.ts
    insurance.schemas.ts
    reminder.scheduler.ts    # Rappels echeance
    __tests__/
      insurance.test.ts
      reminder.test.ts
apps/web/src/
  app/(dashboard)/legal/
    insurance/
      page.tsx               # Liste assurances
      upload/page.tsx         # Upload attestation
  components/legal/
    insurance-card.tsx
    insurance-upload.tsx
    expiry-alert.tsx
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.4]: Coffre-fort numerique pour attestations decennales et RC Pro
// BUSINESS RULE [CDC-2.4]: Rappel automatique 1 mois avant echeance

Types d'assurances :
  - Responsabilite Civile Professionnelle (RC Pro)
  - Decennale (obligatoire BTP)
  - Multirisque professionnelle
  - Protection juridique
  - Prevoyance

Pour chaque assurance :
  - Assureur, numero de contrat
  - Date debut, date fin
  - Document PDF de l'attestation
  - Montant de la prime

Rappels :
  - M-2 : "Votre assurance [X] expire dans 2 mois"
  - M-1 : "Votre assurance [X] expire dans 1 mois - pensez a renouveler"
  - J-7 : "URGENT : Votre assurance [X] expire dans 7 jours"
```

**Tests requis :**
- Test CRUD assurances
- Test upload/stockage document
- Test rappels aux bonnes dates
- Test notification (mock)

---

## Prompt 8.1 — Dashboard Principal ✅

Lis les skills 050 (chart-component), 058 (dashboard-widget).

Implemente le tableau de bord principal "actionnable".

**Fichiers a creer :**
```
apps/api/src/modules/dashboard/
  dashboard.routes.ts
  dashboard.service.ts
  __tests__/
    dashboard.test.ts
apps/web/src/
  app/(dashboard)/
    page.tsx                 # Dashboard (remplacer le skeleton)
  components/dashboard/
    kpi-card.tsx             # Widget KPI
    receivables-widget.tsx   # "Ce qu'on me doit"
    payables-widget.tsx      # "Ce que je dois"
    cash-widget.tsx          # "Mon reste a vivre reel"
    recent-activity.tsx      # Activite recente
    upcoming-payments.tsx    # Echeances a venir
    revenue-chart.tsx        # Graphique CA mensuel
```

**Specifications :**
```
// BUSINESS RULE [CDC-4]: Trois indicateurs : "Ce qu'on me doit", "Ce que je dois", "Mon reste a vivre reel"
// BUSINESS RULE [CDC-4]: Pas de graphiques complexes inutiles

KPI principaux (toujours visibles) :
1. "Ce qu'on me doit" : Somme des remaining_cents des factures emises non payees
2. "Ce que je dois" : Somme des remaining_cents des factures fournisseurs non payees
3. "Mon reste a vivre reel" : Solde bancaire - Ce que je dois + Ce qu'on me doit (pondere par probabilite d'encaissement)

Widgets secondaires :
  - Echeances cette semaine (factures a payer + a encaisser)
  - Activite recente (5 derniers evenements)
  - CA du mois vs mois precedent
  - Graphique CA mensuel (6 derniers mois, barres simples)

API : GET /api/dashboard
  Retourne toutes les donnees agregees en une seule requete
```

**Tests requis :**
- Test calcul KPI "Ce qu'on me doit"
- Test calcul KPI "Ce que je dois"
- Test calcul "Reste a vivre reel"
- Test avec donnees vides (nouveau tenant)
- Test performance (query optimisee)

---

## Prompt 8.2 — Onboarding Magique ✅

Lis les skills 057 (onboarding-wizard), 027 (siret-lookup).

Implemente le flow d'onboarding pour les nouveaux utilisateurs.

**Fichiers a creer :**
```
apps/web/src/
  app/(onboarding)/
    layout.tsx               # Layout onboarding (sans sidebar)
    page.tsx                 # Redirect vers etape 1
    step-1/page.tsx          # SIRET + infos entreprise
    step-2/page.tsx          # Personnalisation (logo, couleurs)
    step-3/page.tsx          # Connexion bancaire (optionnel)
    step-4/page.tsx          # Premier client + premier devis
    complete/page.tsx        # Felicitations + redirect dashboard
  components/onboarding/
    step-indicator.tsx       # Indicateur d'etapes
    siret-autocomplete.tsx   # Auto-complete SIRET
    logo-upload.tsx          # Upload logo
    bank-connect-prompt.tsx  # CTA connexion bancaire
    quick-quote.tsx          # Mini editeur devis
```

**Specifications :**
```
// BUSINESS RULE [CDC-4]: Onboarding Magique
// BUSINESS RULE [CDC-4]: Recuperation automatique identite entreprise via SIRET (API Pappers/Insee)

Etapes :
1. "Votre entreprise" :
   - Saisir SIRET → auto-remplissage nom, adresse, NAF, forme juridique
   - Completer : email, telephone, site web
   
2. "Personnalisez" :
   - Upload logo (optionnel)
   - Couleur principale (pour devis/factures)
   - Numero de TVA intra-communautaire

3. "Connectez votre banque" (optionnel, skip possible) :
   - Widget Bridge pour connexion bancaire
   - "Vous pourrez le faire plus tard"

4. "Votre premier devis" :
   - Creer un client rapidement
   - Creer un devis simple (3 lignes max)
   - Montrer la puissance de l'outil

5. "C'est parti !" :
   - Resume de la configuration
   - Redirect vers le dashboard
```

**Tests requis :**
- Test flow complet (navigation etapes)
- Test auto-remplissage SIRET
- Test skip etape optionnelle
- Test redirect finale

---

## Prompt 9.1 — Export Comptable FEC ✅

Lis les skills 029 (fec-export), 040 (import-export).

Implemente l'export au format FEC et les integrations comptables.

**Fichiers a creer :**
```
apps/api/src/modules/accounting/
  fec/
    fec-generator.ts         # Generateur FEC
    fec-mapper.ts            # Mapping donnees → ecritures comptables
    fec-validator.ts         # Validation conformite
    __tests__/
      fec-generator.test.ts
      fec-mapper.test.ts
      fec-validator.test.ts
  accounting.routes.ts       # Routes export
  accounting.service.ts
apps/web/src/
  app/(dashboard)/
    settings/
      accounting/
        page.tsx             # Parametres comptables
        export/page.tsx      # Export FEC
  components/accounting/
    fec-export-form.tsx
    plan-comptable.tsx
```

**Specifications :**
```
// BUSINESS RULE [CDC-3.2]: Export au format FEC (Fichier des Ecritures Comptables)
// BUSINESS RULE [CDC-3.2]: API vers Sage, Cegid, Pennylane

Format FEC (obligatoire pour controle fiscal) :
  - Fichier texte tabulé (TSV)
  - Colonnes obligatoires :
    JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib,
    CompAuxNum, CompAuxLib, PieceRef, PieceDate, EcritureLib, Debit, Credit,
    EcritureLet, DateLet, ValidDate, Montantdevise, Idevise

Mapping comptable :
  - Factures emises → Journal VE (Ventes)
  - Factures fournisseurs → Journal AC (Achats)
  - Paiements → Journal BQ (Banque)
  - Plan comptable simplifie pour TPE :
    411xxx : Clients
    401xxx : Fournisseurs
    512xxx : Banque
    7xxxxx : Produits
    6xxxxx : Charges

Export : GET /api/accounting/fec?from=2026-01-01&to=2026-12-31
  Retourne le fichier FEC telecharger
```

**Tests requis :**
- Test generation FEC simple (1 facture vente + 1 achat)
- Test mapping comptable correct
- Test format colonnes FEC
- Test validation conformite
- Test periode vide (pas d'erreur)

---

## Prompt 9.2 — Integration Paiements (Stripe + GoCardless) ✅

Lis les skills 030 (stripe-integration), 018 (webhook-handler).

Implemente les integrations de paiement.

**Fichiers a creer :**
```
apps/api/src/modules/payment/
  stripe/
    stripe-client.ts         # Client Stripe
    stripe-webhooks.ts       # Handler webhooks Stripe
    checkout.service.ts      # Creation session Checkout
    __tests__/
      stripe-client.test.ts
      stripe-webhooks.test.ts
  gocardless/
    gocardless-client.ts     # Client GoCardless
    mandate.service.ts       # Gestion mandats SEPA
    __tests__/
      gocardless-client.test.ts
apps/web/src/
  app/(dashboard)/
    settings/
      payments/
        page.tsx             # Configuration paiements
  components/payment/
    stripe-connect-button.tsx
    payment-link.tsx
    gocardless-mandate.tsx
```

**Specifications :**
```
// BUSINESS RULE [CDC-3.2]: Stripe pour paiements par carte
// BUSINESS RULE [CDC-3.2]: GoCardless pour prelevements SEPA

Stripe :
  - Stripe Connect pour encaisser au nom du tenant
  - Generation de liens de paiement sur les factures
  - Webhook payment_intent.succeeded → marquer facture payee
  - Webhook checkout.session.completed → enregistrer paiement

GoCardless :
  - Creation de mandats SEPA (prelevement)
  - Prelevement automatique a l'echeance
  - Webhook pour suivi statut (paid, failed, cancelled)
```

**Tests requis :**
- Test creation session Stripe Checkout
- Test webhook Stripe (signature verifiee)
- Test creation mandat GoCardless
- Test enregistrement paiement auto via webhook

---

## Prompt 9.3 — Connecteur PPF/PDP ✅

Lis les skills 059 (ppf-connector).

Implemente la connexion au Portail Public de Facturation.

**Fichiers a creer :**
```
apps/api/src/modules/invoice/
  ppf/
    ppf-client.ts            # Client API PPF/AIFE
    ppf-sender.ts            # Envoi factures au PPF
    ppf-receiver.ts          # Reception factures entrantes
    ppf-status.ts            # Suivi statut transmission
    __tests__/
      ppf-client.test.ts
      ppf-sender.test.ts
apps/web/src/
  app/(dashboard)/
    settings/
      ppf/
        page.tsx             # Configuration PPF
  components/invoice/
    ppf-status-badge.tsx     # Statut transmission PPF
```

**Specifications :**
```
// BUSINESS RULE [CDC-2.1]: Transmission automatique au PPF ou via PDP
// BUSINESS RULE [CDC-3.2]: Connexion API officielle AIFE

Flux sortant (emission) :
  1. Facture finalisee au format Factur-X
  2. Transmission au PPF via API AIFE
  3. Suivi du cycle de vie :
     - deposee → en cours de traitement → acceptee / refusee
  4. Stockage du statut et des retours PPF

Flux entrant (reception) :
  1. Webhook PPF pour nouvelles factures recues
  2. Telechargement du Factur-X
  3. Extraction des donnees XML
  4. Creation automatique d'un Purchase

Annuaire PPF :
  - Lookup SIRET → adresse de facturation electronique
  - Cache local de l'annuaire
```

**Tests requis :**
- Test envoi facture au PPF (mock API)
- Test suivi statut
- Test reception facture entrante
- Test lookup annuaire

---

## Prompt 10.1 — Optimisation Performance ✅

Implemente les optimisations de performance.

**Fichiers a creer/modifier :**
```
apps/api/src/
  plugins/
    cache.ts                 # Plugin Redis cache
  lib/
    cache.ts                 # Helpers cache avec invalidation
    query-optimizer.ts       # Requetes optimisees (indexes, includes)
packages/db/prisma/
  schema.prisma              # Ajouter indexes manquants
apps/web/src/
  lib/
    swr-config.ts            # Configuration SWR pour cache frontend
  components/
    suspense-wrapper.tsx     # Wrapper Suspense + skeleton
```

**Specifications :**
- Ajouter Redis pour cache :
  - Dashboard KPIs : cache 5min
  - Liste clients/produits : cache 1min
  - Lookup SIRET : cache 24h
  - Invalidation sur mutation
- Indexes DB :
  - `(tenant_id, deleted_at)` sur toutes les tables
  - `(tenant_id, status)` sur quotes, invoices, purchases
  - `(tenant_id, client_id)` sur quotes, invoices
  - `(tenant_id, date)` sur bank_transactions
  - Full-text index sur client.company_name, client.last_name
- Frontend :
  - SWR pour cache cote client
  - React Suspense avec skeletons
  - Lazy loading des composants lourds (editeur devis, graphiques)

**Tests requis :**
- Test cache hit/miss/invalidation
- Test que les indexes sont utilises (EXPLAIN ANALYZE)
- Test performance dashboard (< 200ms)

---

## Prompt 10.2 — Securite et Hardening ✅

Implemente les mesures de securite finales.

**Fichiers a creer/modifier :**
```
apps/api/src/
  plugins/
    security.ts              # Headers securite, CORS, CSRF
    sanitize.ts              # Sanitization des inputs
  lib/
    encryption.ts            # AES-256 pour donnees sensibles
    rate-limiter.ts          # Update : rate limiting avance
apps/web/src/
  middleware.ts              # Next.js middleware (CSP, redirects)
```

**Specifications :**
```
// BUSINESS RULE [CDC-6]: Chiffrement AES-256
// BUSINESS RULE [CDC-6]: Double authentification (2FA) obligatoire

- Headers securite :
  - Strict-Transport-Security
  - Content-Security-Policy
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  
- CORS configure strictement (domaines autorises uniquement)
- CSRF protection sur les mutations
- Rate limiting avance :
  - Auth endpoints : 5 tentatives / 15min
  - API generale : 100 req/min/tenant
  - Upload : 10 req/min/user
  
- Chiffrement AES-256 :
  - Credentials connecteurs fournisseurs
  - Tokens bancaires
  - IBAN/BIC
  
- Sanitization :
  - XSS protection sur tous les inputs texte
  - SQL injection prevention (deja gere par Prisma)
  
- Audit :
  - Toutes les actions sensibles sont loguees
  - IP + User-Agent sur chaque action
```

**Tests requis :**
- Test headers securite presents
- Test CORS (domaine autorise et refuse)
- Test rate limiting (depasse limite)
- Test chiffrement/dechiffrement AES-256
- Test sanitization (tentative XSS)

---

## Prompt 10.3 — CI/CD et Configuration Deploiement ✅

Configure le pipeline CI/CD et la configuration de deploiement.

**Fichiers a creer :**
```
.github/
  workflows/
    ci.yml                   # Pipeline CI (lint, test, build)
    deploy-staging.yml       # Deploy staging
    deploy-production.yml    # Deploy production
docker/
  Dockerfile.api             # Image API
  Dockerfile.web             # Image Web
  Dockerfile.ocr             # Image OCR
  docker-compose.yml         # Dev local
  docker-compose.prod.yml    # Production
.env.example                 # Template variables d'environnement
```

**Specifications CI :**
```yaml
# Pipeline CI :
1. Lint (ESLint + Prettier check)
2. Type check (tsc --noEmit)
3. Tests unitaires (Vitest)
4. Tests integration (avec DB PostgreSQL)
5. Build tous les packages
6. Check couverture (>= 80% global, >= 95% code financier)
```

**Docker :**
- Multi-stage builds pour images minimales
- Health checks sur chaque service
- docker-compose.yml pour dev local avec :
  - PostgreSQL 16
  - Redis
  - API (hot reload)
  - Web (hot reload)
  - OCR service

**Tests requis :**
- Test Docker build (chaque image)
- Test docker-compose up (services demarrent)
- Test CI pipeline (lint + typecheck + tests)
