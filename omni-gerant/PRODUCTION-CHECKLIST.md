# Checklist Mise en Production — zenAdmin

## Infrastructure
- [x] PostgreSQL provisionne sur Render (zenadmin-db, plan free)
- [x] Migrations Prisma appliquees (`prisma migrate deploy` dans build command)
- [x] render.yaml complet (DB + API service + env vars)
- [x] Health check configure (`/health/ready`)

## Variables d'environnement
- [x] `JWT_SECRET` — genere par Render (`generateValue: true`)
- [x] `ENCRYPTION_KEY` — genere par Render (`generateValue: true`)
- [x] `DATABASE_URL` — reference depuis le service DB
- [x] `CORS_ORIGIN` — `https://omni-gerant.vercel.app`
- [x] `NODE_ENV` — `production`
- [x] Validation au demarrage : refuse les secrets par defaut

## Securite
- [x] Headers securite (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- [x] CORS strict (methodes explicites, headers autorises)
- [x] Rate limiting (5 req/15min auth, 100 req/min API, 10 req/min upload)
- [x] Sanitization XSS
- [x] Chiffrement AES-256-GCM pour IBAN/tokens
- [x] CSRF tokens
- [x] Pas de secrets dans le code source

## Monitoring
- [x] `/health` — liveness probe
- [x] `/health/ready` — readiness probe avec DB check
- [x] `/health/live` — simple liveness
- [x] `/health/full` — DB + memory stats
- [x] `/metrics` — request counters, error rate, memory
- [x] Logs structures JSON en production (pino)
- [x] Correlation ID sur chaque requete

## Frontend
- [x] `NEXT_PUBLIC_API_URL` pointe vers l'API Render
- [x] Meta tags SEO (title, description, Open Graph)
- [x] Page de maintenance (`/maintenance`)
- [x] Lang `fr` sur le HTML

## Tests
- [x] 714 tests unitaires passent (Vitest)
- [x] E2E Playwright config pour production
- [x] 4 parcours E2E (auth+devis, facturation, DUERP, banque)
- [x] Script smoke-test.sh
- [x] Tests non-regression API routes

## Fonctionnalites core
- [x] Login / Register
- [x] Dashboard avec KPIs
- [x] Creation devis
- [x] Creation facture + PDF
- [x] DUERP creation + risques NAF
- [x] Donnees persistent (PostgreSQL)

## Deploiement
- [x] Build command : pnpm install + shared build + db build + prisma generate + migrate deploy
- [x] Start command : `cd apps/api && node --import tsx src/index.ts`
- [x] Graceful shutdown (Prisma disconnect on close)
- [x] Startup DB connection verification
