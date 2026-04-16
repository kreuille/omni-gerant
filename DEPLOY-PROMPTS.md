# Prompts Mise en Production — zenAdmin (D0 a D4)

> Pre-requis : Chantier 14 (Migration PostgreSQL P0-P6) doit etre termine.

---

## D0 — Provision PostgreSQL + Deploy API

Lis `.claude/skills/000-dev-rules/SKILL.md`.
Lis `render.yaml`, `.env.example`, `packages/db/prisma/schema.prisma`.

### Objectif
Provisionner la base de donnees PostgreSQL sur Render, configurer les variables d'environnement, deployer l'API avec persistence reelle.

### Implementation

#### 1. Mettre a jour render.yaml

Ajouter le service PostgreSQL et les variables :
```yaml
databases:
  - name: zenadmin-db
    plan: free
    databaseName: zenadmin
    user: zenadmin

services:
  - type: web
    name: zenadmin-api
    runtime: node
    plan: free
    buildCommand: pnpm install && pnpm --filter @omni-gerant/shared build && pnpm --filter @omni-gerant/db build && cd packages/db && npx prisma generate && npx prisma migrate deploy
    startCommand: cd apps/api && node --import tsx src/index.ts
    envVars:
      - key: NODE_ENV
        value: production
      - key: HOST
        value: "0.0.0.0"
      - key: PORT
        value: "3001"
      - key: JWT_SECRET
        generateValue: true
      - key: ENCRYPTION_KEY
        generateValue: true
      - key: CORS_ORIGIN
        value: https://zenadmin.vercel.app
      - key: DATABASE_URL
        fromDatabase:
          name: zenadmin-db
          property: connectionString
```

#### 2. Mettre a jour le build command

Le build doit :
1. Installer les deps (`pnpm install`)
2. Builder shared (`pnpm --filter @omni-gerant/shared build`)
3. Builder db (`pnpm --filter @omni-gerant/db build`)
4. Generer le Prisma client (`prisma generate`)
5. Appliquer les migrations (`prisma migrate deploy`)

#### 3. Configurer le start command

```bash
cd apps/api && node --import tsx src/index.ts
```

L'API doit au demarrage :
- Verifier la connexion DB (`prisma.$connect()`)
- Logger la version et l'etat de la DB
- Etre prête a recevoir des requetes

#### 4. Health check avec DB

Modifier `apps/api/src/routes/health.ts` pour verifier la connexion DB :
```typescript
app.get('/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
  } catch {
    return { status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() };
  }
});
```

#### 5. Mettre a jour la config Vercel frontend

Verifier que `NEXT_PUBLIC_API_URL` pointe vers `https://zenadmin-api.onrender.com` (deja fait normalement).

#### 6. Graceful shutdown

S'assurer que l'API ferme proprement la connexion Prisma a l'arret :
```typescript
app.addHook('onClose', async () => {
  await prisma.$disconnect();
});
```

### Tests D0
- `render.yaml` est valide
- Health check retourne `db: connected`
- L'API demarre et se connecte a PostgreSQL
- `pnpm test` — 0 regression
- `pnpm build` — 0 erreur

Commit : `feat(deploy): D0 configure PostgreSQL on Render and update deployment`

---

## D1 — Securite Production

Lis `.claude/skills/000-dev-rules/SKILL.md` et `.claude/skills/601-security-expert/SKILL.md`.
Lis `apps/api/src/plugins/` et `apps/api/src/middleware/`.

### Objectif
Durcir la securite pour un environnement de production.

### Implementation

#### 1. Variables d'environnement securisees

Verifier que TOUTES les cles sensibles utilisent `generateValue: true` ou sont des secrets Render :
- `JWT_SECRET` — genere par Render
- `ENCRYPTION_KEY` — genere par Render
- `DATABASE_URL` — reference depuis le service DB

Ajouter une validation au demarrage : si une variable critique manque, l'API refuse de demarrer.

```typescript
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'CORS_ORIGIN'] as const;

function validateEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET === 'change-me-to-a-random-64-char-string') {
    throw new Error('JWT_SECRET must be changed from default value');
  }
}
```

#### 2. Rate limiting par tenant

Verifier que le rate limiter est actif en production :
- 100 req/min par IP pour les endpoints publics (login, register)
- 300 req/min par tenant pour les endpoints authentifies
- 10 req/min pour les endpoints sensibles (password reset, 2FA setup)

#### 3. CORS strict

```typescript
cors: {
  origin: process.env.CORS_ORIGIN, // UNIQUEMENT le frontend
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}
```

#### 4. Headers de securite

Ajouter les headers CSP et securite (si pas deja fait) :
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

#### 5. Audit trail en production

S'assurer que l'audit log capture :
- Toutes les connexions (succes + echec)
- Les actions sensibles (creation facture, modification settings)
- L'IP et le user-agent

#### 6. Nettoyer les donnees de dev

- Supprimer les comptes/donnees de test si presents en DB
- Verifier qu'aucun mot de passe en clair n'est loge
- Verifier qu'aucune cle API n'est committee dans le code

### Tests D1
- L'API refuse de demarrer sans les env vars critiques
- Rate limiting fonctionne
- CORS bloque les origines non autorisees
- Headers de securite presents
- `pnpm test` — 0 regression

Commit : `feat(deploy): D1 production security hardening`

---

## D2 — Monitoring + Alertes + Backups

Lis `.claude/skills/000-dev-rules/SKILL.md` et `.claude/skills/106-sre-monitoring/SKILL.md`.
Lis `apps/api/src/routes/health.ts`.

### Objectif
Monitoring, alertes, et strategie de backup pour la production.

### Implementation

#### 1. Health check enrichi

```typescript
GET /health → { status, db, uptime, version, memory }
GET /health/ready → { ready: true/false } // pour Render health check
GET /health/live → { alive: true }
```

Configurer Render pour utiliser `/health/ready` comme health check path.

#### 2. Metriques applicatives

Ajouter un endpoint `/metrics` (protege par API key) :
```typescript
GET /metrics → {
  requests_total: number,
  requests_per_minute: number,
  db_query_avg_ms: number,
  active_tenants: number,
  invoices_created_today: number,
  errors_last_hour: number
}
```

#### 3. Logging structure pour production

S'assurer que tous les logs sont en JSON structure :
```json
{
  "level": "info",
  "timestamp": "2026-04-16T10:00:00Z",
  "correlation_id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "action": "invoice.create",
  "duration_ms": 45
}
```

Render capture les logs stdout automatiquement.

#### 4. Strategie de backup PostgreSQL

Render free tier : pas de backup automatique. Ajouter un endpoint admin protege :
```typescript
GET /admin/export-db → dump SQL compresse
```

OU creer un script qui fait un `pg_dump` quotidien vers un bucket S3 / Google Cloud Storage.

Alternative simple pour le MVP : cron job qui exporte les donnees critiques (factures, clients, DUERP) en JSON chaque nuit.

#### 5. Alertes basiques

Creer un middleware qui detecte les erreurs critiques et les loge en `error` :
- DB connection lost
- Taux d'erreur > 10% sur 5 minutes
- Memoire > 80% du container

Pour le MVP, les alertes sont dans les logs Render (pas besoin d'un service externe).

### Tests D2
- `/health/ready` retourne 200 quand tout va bien
- `/metrics` retourne les metriques correctes
- Logs en JSON structure
- `pnpm test` — 0 regression

Commit : `feat(deploy): D2 monitoring, metrics and backup strategy`

---

## D3 — E2E Tests Production

Lis `.claude/skills/000-dev-rules/SKILL.md` et `.claude/skills/600-qa-engineer/SKILL.md`.
Lis `playwright.config.ts` et `e2e/`.

### Objectif
Valider que l'application fonctionne de bout en bout sur l'environnement de production.

### Implementation

#### 1. Adapter Playwright pour tester contre la prod

Creer `playwright.config.prod.ts` :
```typescript
export default defineConfig({
  ...baseConfig,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://zenadmin.vercel.app',
  },
});
```

#### 2. Scenarios E2E critiques

Ecrire (ou adapter) les tests pour les parcours utilisateur complets :

**Parcours 1 — Inscription + Premier devis** :
1. `POST /api/auth/register` → cree un compte
2. `POST /api/auth/login` → obtient un token
3. Onboarding step 1 (SIRET lookup)
4. Onboarding step 2 (personnalisation)
5. Creation d'un devis
6. Envoi du devis
7. Page publique de partage du devis

**Parcours 2 — Facturation complete** :
1. Login
2. Creer un client
3. Creer un devis → convertir en facture
4. Verifier le PDF
5. Marquer comme payee
6. Verifier le dashboard (KPI "CA" mis a jour)

**Parcours 3 — DUERP** :
1. Login
2. Creer un DUERP (selection NAF)
3. Verifier les risques charges automatiquement
4. Ajouter une unite de travail
5. Generer le PDF
6. Verifier l'archivage

**Parcours 4 — Banque + Rapprochement** :
1. Login
2. Ajouter un compte bancaire (manuel)
3. Ajouter une transaction
4. Creer une facture
5. Rapprocher la transaction avec la facture
6. Verifier les previsions

#### 3. Tests de non-regression API

Script qui lance toutes les routes documentees et verifie les status codes :
```typescript
const ROUTES = [
  { method: 'GET', path: '/health', expected: 200 },
  { method: 'POST', path: '/api/auth/login', expected: 400 }, // sans body = 400
  { method: 'GET', path: '/api/dashboard', expected: 401 }, // sans auth = 401
  // ...
];
```

#### 4. Script de smoke test

Creer `scripts/smoke-test.sh` executable apres chaque deploy :
```bash
#!/bin/bash
API_URL="${1:-https://zenadmin-api.onrender.com}"
echo "Smoke test: $API_URL"
curl -sf "$API_URL/health" | jq .status
# ... autres checks
```

### Tests D3
- E2E Parcours 1-4 passent
- Smoke test retourne OK
- `pnpm test` — 0 regression

Commit : `feat(deploy): D3 E2E tests and smoke test for production`

---

## D4 — Domaine + SSL + Configuration finale

Lis `.claude/skills/000-dev-rules/SKILL.md`.

### Objectif
Configurer le domaine custom, SSL, et finaliser la mise en production.

### Implementation

#### 1. Domaine custom (si achete)

**Frontend (Vercel)** :
- Ajouter le domaine dans les settings Vercel
- Configurer les DNS (CNAME vers `cname.vercel-dns.com`)

**API (Render)** :
- Ajouter le domaine API (api.zenadmin.fr)
- Configurer les DNS
- Render gere le SSL automatiquement

#### 2. Mettre a jour les references

Si domaine custom :
- `CORS_ORIGIN` → `https://zenadmin.fr`
- `NEXT_PUBLIC_API_URL` → `https://api.zenadmin.fr`
- Links dans les emails (relances, partage devis)
- Liens publics de partage de devis

#### 3. SEO + Meta tags

Ajouter dans `apps/web/src/app/layout.tsx` :
```typescript
export const metadata = {
  title: 'zenAdmin — Gestion complete pour TPE',
  description: 'Facturation electronique, DUERP, tresorerie, devis — tout-en-un pour les TPE francaises.',
  openGraph: { ... },
};
```

#### 4. Page de maintenance

Creer une page `/maintenance` statique que Vercel peut servir si l'API est down.

#### 5. Checklist finale de mise en production

Verifier chaque point :
- [ ] PostgreSQL provisionne et accessible
- [ ] Migrations appliquees (`prisma migrate deploy`)
- [ ] Seed execute (au moins 1 tenant admin)
- [ ] Variables d'environnement configurees (JWT, DB, CORS)
- [ ] Health check repond OK
- [ ] Frontend charge et se connecte a l'API
- [ ] Login / Register fonctionne
- [ ] Creation devis fonctionne
- [ ] Creation facture + PDF fonctionne
- [ ] DUERP creation + PDF fonctionne
- [ ] Dashboard affiche des KPIs
- [ ] Donnees persistent entre redemarrages
- [ ] Rate limiting actif
- [ ] CORS correctement configure
- [ ] Pas de secrets dans le code source
- [ ] Logs structures en JSON

#### 6. README.md de production

Mettre a jour le README avec :
- URLs de production
- Comment deployer
- Comment rollback
- Comment acceder aux logs
- Comment faire un backup DB

### Tests D4
- Domaine custom accessible (si configure)
- SSL valide
- Checklist finale : tous les points coches
- Smoke test passe sur l'URL finale

Commit : `feat(deploy): D4 domain, SSL and production checklist`

---

## Regles communes

- Ne jamais committer de secrets dans le code
- Toujours utiliser les variables d'environnement pour les cles
- Tester sur l'environnement de staging avant la prod (ou sur Render preview)
- Chaque deploiement doit etre reversible (migrations reversibles, rollback possible)
- Logger en JSON structure partout
- Monitorer la DB (connexions, queries lentes, espace disque)
