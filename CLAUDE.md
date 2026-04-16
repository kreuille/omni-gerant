# zenAdmin - Regles du Projet

## Vision
Plateforme SaaS "tout-en-un" pour TPE, artisans et auto-entrepreneurs.
Objectif Zero Saisie, Conformite Native (Factur-X 2026), Pilotage Proactif.

## Deploiement Production
- **Frontend** : https://omni-gerant.vercel.app (Vercel) — a renommer
- **API** : https://zenadmin-api.onrender.com (Render, plan free)
- **Database** : PostgreSQL sur Render (zenadmin-db, plan free)
- **GitHub** : https://github.com/kreuille/omni-gerant (public) — a renommer
- **Vercel project ID** : prj_rrWWOdvv2q3x6TpkOZLvDTNrPFvF
- **Vercel scope** : arnaudguedou-1634s-projects
- **Render service** : srv-d7fkjk471suc73bccdg0

> **Note** : L'API utilise **PostgreSQL** via Prisma ORM. Les donnees sont persistees entre les redeploys. Les secrets (JWT_SECRET, ENCRYPTION_KEY) sont generes automatiquement par Render.

## Stack Technique
- **Frontend** : Next.js 14.2 (App Router), TypeScript strict, Tailwind CSS
- **Backend** : Node.js + Fastify + TypeScript strict (tsx runtime)
- **Database** : PostgreSQL 16 + Prisma ORM (migre depuis in-memory Maps)
- **AI/OCR** : Python FastAPI + LayoutLM/Donut (prevu)
- **Monorepo** : pnpm workspaces + Turborepo
- **Tests** : Vitest (914 tests, 63 fichiers) + Playwright E2E (51 tests + 4 parcours prod)

## Structure Monorepo
```
zenadmin/
  apps/
    web/          # Next.js frontend (port 3000)
    api/          # Fastify backend (port 3001)
    ocr/          # Python FastAPI OCR service (prevu)
  packages/
    shared/       # Types partages, utils, Result pattern
    db/           # Prisma schema, migrations, seeds, repositories
    config/       # ESLint, TSConfig partages
  e2e/            # Tests Playwright E2E (local + prod)
  scripts/        # smoke-test.sh
  render.yaml     # Blueprint Render (API + PostgreSQL)
  PRODUCTION-CHECKLIST.md  # Checklist mise en production
  .claude/
    launch.json   # Config serveurs dev (web + api)
```

## Modules Implementes

### 1. Authentification & Securite
- JWT (access + refresh tokens), 2FA TOTP
- RBAC (owner, admin, member, accountant)
- Ressources : tenant, user, client, product, quote, invoice, purchase, bank, audit, settings, billing, export, **legal**
- Middleware CSP, rate limiting, audit trail

### 2. Ventes (Devis & Factures)
- CRUD devis avec workflow (draft -> sent -> accepted -> invoiced -> cancelled)
- CRUD factures avec numerotation sequentielle (FAC-YYYY-NNN)
- Calcul TVA multi-taux France (20%, 10%, 5.5%, 2.1%)
- **Moteur TVA intelligent** : 7 regimes (franchise, standard, intracom UE, export, sous-traitance BTP, exonere, DOM-TOM) x 19 secteurs d'activite
- **Generateur mentions legales** automatique par forme juridique x secteur x type client
- Detection automatique type client (France particulier/pro, UE pro/particulier, hors UE)
- Attestation simplifiee BTP (CERFA 1301-SD) pour taux reduit
- Alertes depassement seuil franchise (auto-entrepreneurs)
- Generation PDF, Factur-X XML
- Partage de devis par lien public (/share/quote/[token])
- Relances automatiques pour factures impayees

### 3. Achats & Fournisseurs
- CRUD fournisseurs avec lookup SIRET
- CRUD achats avec validation workflow
- OCR upload pour extraction automatique
- Detection automatique de risques chimiques/equipements dans les achats

### 4. Banque
- Connexion bancaire (Open Banking / GoCardless)
- Rapprochement bancaire automatique
- Previsions de tresorerie
- Graphique CA mensuel sur le dashboard

### 5. Effectif & Postes (RH)
- **Module HR** complet pour gestion des postes, employes, formations et visites medicales
- **Templates de postes** pour 8 metiers (BTP, Restaurant, Coiffure, Commerce, Boulangerie, Garage, Aide domicile, Bureau)
- Auto-fill des postes depuis code NAF + effectif Pappers
- Detection automatique surveillance medicale renforcee (SMR)
- **WorkforceForDuerp** : service de liaison vers le DUERP (postes, effectifs, alertes formations/visites)
- 9 declencheurs automatiques DUERP (nouveau poste, exposition chimique, travail nuit, etc.)
- Wizard frontend 3 etapes (Postes -> Employes -> Formations)

### 6. Legal & Conformite
- **DUERP V3** : Document Unique d'Evaluation des Risques Professionnels
  - Base de risques pour **8 profils metier** specifiques + 6 risques universels
  - Matrice conforme 4x4 (gravite 1-4 x frequence 1-4 → score 1-16, 4 niveaux)
  - **Plan d'actions** structure (responsable, delai, budget, suivi)
  - **PAPRIPACT** obligatoire 50+ salaries avec consultation CSE
  - **Maladies professionnelles** : 8 tableaux RG (57A, 65, 66, 30/30bis, 42, 98, 79, 58)
  - **Formations obligatoires** : 12 formations par secteur (SST, HACCP, CACES, etc.)
  - **EPI par risque** : 13 equipements avec normes EN
  - **Mise a jour annuelle** + 8 declencheurs automatiques + 7 rappels
  - Conservation 40 ans (Loi 2021-1018) + depot dematerialise
  - Penalites conformite (1 500 EUR / 3 000 EUR / 3 750 EUR)
  - References legales par secteur (PPSPS BTP, HACCP Restaurant, etc.)
  - **Unites de travail** types pour 8 metiers (4-6 UT chacun) + support etablissements Pappers
  - Generation PDF
  - Detection de risques depuis les achats
- **RGPD** : Registre des traitements
- **Assurances** : Coffre-fort numerique

### 7. Parametres
- Paiements (Stripe Connect, GoCardless)
- PPF (Portail Public de Facturation)
- Comptabilite (plan comptable, export FEC)
- Connecteurs (API tierces)
- **Profil Entreprise** : auto-fill SIRET (cascade Pappers → SIRENE → data.gouv.fr), detection forme juridique, regime TVA, verification VIES

### 8. Onboarding
- Wizard 4 etapes (entreprise, activite, coordonnees, validation)
- Lookup SIRET automatique

### 9. Dashboard
- KPIs : CA, creances, dettes, reste a vivre
- Graphique CA mensuel
- Echeances de la semaine
- Activite recente

## API Endpoints Principaux

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraichir le token
- `POST /api/auth/2fa/setup` - Configurer 2FA
- `POST /api/auth/2fa/verify` - Verifier 2FA

### Ventes
- `GET/POST /api/quotes` - Devis (CRUD)
- `POST /api/quotes/:id/send` - Envoyer un devis
- `POST /api/quotes/:id/accept` - Accepter un devis
- `POST /api/quotes/:id/convert` - Convertir en facture
- `GET/POST /api/invoices` - Factures (CRUD)
- `GET /api/invoices/:id/pdf` - PDF facture
- `GET /api/invoices/:id/facturx` - XML Factur-X

### Achats
- `GET/POST /api/purchases` - Achats (CRUD)
- `GET/POST /api/suppliers` - Fournisseurs (CRUD)

### Banque
- `GET/POST /api/bank/accounts` - Comptes bancaires
- `GET /api/bank/transactions` - Transactions
- `POST /api/bank/reconciliation` - Rapprochement
- `GET /api/bank/forecast` - Previsions

### Effectif & Postes (RH)
- `GET/POST /api/hr/positions` - Postes (CRUD)
- `PUT/DELETE /api/hr/positions/:id` - Modifier/supprimer un poste
- `GET/POST /api/hr/employees` - Employes (CRUD)
- `PUT/DELETE /api/hr/employees/:id` - Modifier/supprimer un employe
- `GET /api/hr/templates/:nafCode` - Templates postes par code NAF
- `GET /api/hr/trainings` - Formations de l'entreprise
- `GET /api/hr/trainings/expiring` - Formations expirant dans 90j
- `GET /api/hr/trainings/missing` - Formations obligatoires manquantes
- `GET /api/hr/medical-visits` - Visites medicales
- `GET /api/hr/medical-visits/upcoming` - Visites a planifier
- `GET /api/hr/dashboard` - Dashboard RH
- `GET /api/hr/workforce-for-duerp` - Donnees RH formatees pour le DUERP

### Legal
- `GET/POST /api/legal/duerp` - DUERP (CRUD)
- `GET /api/legal/duerp/risks/:nafCode` - Risques par code NAF
- `POST /api/legal/duerp/detect-risks` - Detection risques achats
- `GET /api/legal/duerp/:id/pdf` - PDF DUERP
- `GET/POST /api/legal/rgpd/treatments` - Traitements RGPD
- `GET/POST /api/legal/insurance` - Assurances

### Parametres
- `GET/PUT /api/settings/accounting` - Comptabilite
- `GET /api/settings/accounting/fec` - Export FEC
- `GET/PUT /api/settings/payments` - Paiements
- `GET/PUT /api/settings/ppf` - PPF

### Monitoring
- `GET /health` - Liveness probe (status, uptime)
- `GET /health/ready` - Readiness probe avec check DB
- `GET /health/live` - Simple liveness ({alive: true})
- `GET /health/full` - Status complet (DB, memory, uptime)
- `GET /metrics` - Metriques applicatives (requests, errors, memory)

---

## Regles de Developpement (000-dev-rules)

### R01 - Result Pattern
Jamais d'exceptions metier. Toujours retourner `Result<T, E>`.
```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
```

### R02 - Montants en Centimes
Tous les montants financiers sont des **entiers** (centimes). Jamais de float.
```typescript
// BON : price_cents: 1500 (= 15.00 EUR)
// MAUVAIS : price: 15.00
```

### R03 - Multi-Tenant avec RLS
Chaque table a une colonne `tenant_id UUID NOT NULL`.
Row Level Security active sur PostgreSQL. Le middleware injecte le tenant_id.

### R04 - Soft Delete
Jamais de DELETE physique. Colonne `deleted_at TIMESTAMPTZ NULL` sur chaque table.
Les queries par defaut filtrent `WHERE deleted_at IS NULL`.

### R05 - TypeScript Strict
`strict: true` dans tsconfig. Pas de `any`, pas de `as` sauf cas justifie avec commentaire.

### R06 - Tests Obligatoires
- Couverture globale : >= 80%
- Code financier (calculs, montants) : >= 95%
- Chaque prompt doit inclure ses tests
- **Tests actuels** : 914 tests unitaires (Vitest, 63 fichiers), 51 tests E2E local + 4 parcours E2E prod (Playwright)

### R07 - Commentaires Business Rule
Chaque regle metier est annotee :
```typescript
// BUSINESS RULE [CDC-2.1]: TVA multi-taux sur un meme document
```

### R08 - Validation aux Frontieres
Validation avec Zod a l'entree de chaque endpoint. Pas de validation interne redondante.

### R09 - IDs
UUID v7 (ordonne chronologiquement) pour toutes les cles primaires.

### R10 - Dates
Toutes les dates en UTC dans la DB. Conversion timezone cote client uniquement.

### R11 - Pagination
Cursor-based pagination par defaut. Offset uniquement si justifie.

### R12 - Logging Structure
JSON structure avec correlation_id, tenant_id, user_id sur chaque log.

### R13 - Erreurs API
Format standard :
```json
{ "error": { "code": "INVOICE_NOT_FOUND", "message": "...", "details": {} } }
```

### R14 - Migrations
Toujours reversibles. Jamais de perte de donnees dans les migrations.

### R15 - Git Conventions
Commits conventionnels : `feat(module): description`, `fix(module): description`, `test(module): description`

---

## Variables d'Environnement

### Frontend (apps/web)
- `NEXT_PUBLIC_API_URL` : URL de l'API (defaut: http://localhost:3001)

### Backend (apps/api)
- `NODE_ENV` : production | development
- `HOST` : 0.0.0.0 (pour Render)
- `PORT` : 3001
- `DATABASE_URL` : URL PostgreSQL (requis)
- `JWT_SECRET` : Cle secrete JWT (min 32 caracteres, requis, genere par Render en prod)
- `ENCRYPTION_KEY` : Cle AES-256 (genere par Render en prod)
- `CORS_ORIGIN` : URL du frontend autorise
- `METRICS_API_KEY` : Cle API pour `/metrics` (optionnel, protege en prod)

---

## Base de Risques DUERP V3

### Profils metier specifiques (risk-database-v2.ts)

8 profils metier detailles avec 8-9 risques specifiques chacun :

| Metier | Code NAF | IDCC | Risques specifiques | UT types |
|--------|----------|------|---------------------|----------|
| BTP general | 41-43 | 1597 | Chute hauteur, ensevelissement, manutention, machines, bruit, poussieres, vibrations, chimique, intemperies | 6 |
| Restaurant | 56.10 | 1979 | Brulures, coupures, glissade, manutention, produits nettoyage, incendie cuisine, bruit, agressions, HACCP | 6 |
| Coiffure | 96.02A | 2596 | Chimique cutane/respiratoire, TMS, postures, coupures, brulures, dermatose, psycho, electrique outils | 5 |
| Commerce | 47.xx | 2216 | Manutention, agressions, TMS caisse, chute reserve, circulation, stress, froid, ergonomie ecran | 6 |
| Boulangerie | 10.71C | 843 | Farine/asthme, brulures, nuit, manutention, ATEX, machines, sol glissant, chaleur | 6 |
| Garage auto | 45.20A | 1090 | Chimique CMR, ecrasement, bruit, electrique HT, manutention, peinture isocyanates, postures, incendie | 6 |
| Aide a domicile | 88.10A | 2941 | Manutention personnes, routier, psycho, biologique, chimique menage, chute domicile, agressions, TMS | 4 |
| Bureau / Tertiaire | 62-71 | — | Ecran, sedentarite, stress, qualite air, harcelement, TMS siege, electrique info, isolement teletravail | 4 |

### 6 risques universels (tous les metiers)
Routier, psychosocial, biologique, incendie, chute de plain-pied, electrique.

### Bases de donnees complementaires
- **Maladies professionnelles** : 8 tableaux RG (57A, 65, 66, 30/30bis, 42, 98, 79, 58)
- **Formations obligatoires** : 12 formations par secteur (SST, HACCP, CACES, SS4, Certiphyto, PRAP, etc.)
- **EPI par risque** : 13 equipements avec normes EN (gants EN 388/374/407, casque EN 397, harnais EN 361, etc.)
- **References legales** par secteur (PPSPS BTP, HACCP Restaurant, ATEX Boulangerie, CMR Garage, etc.)

---

## Table des Skills (Patterns Reutilisables)

| # | Skill | Description | Utilise dans |
|---|-------|-------------|-------------|
| 001 | result-pattern | Type Result<T,E> et helpers ok()/err() | Tous les prompts |
| 002 | cents-money | Type Money, fonctions de calcul en centimes | 4.x, 5.x, 6.x |
| 003 | multi-tenant | Middleware tenant, RLS policies | 1.2, 3.2 |
| 004 | soft-delete | Middleware Prisma pour soft delete auto | 1.2 |
| 005 | zod-validation | Schemas Zod pour validation endpoints | Tous les prompts API |
| 006 | uuid-v7 | Generation UUID v7 | 1.2 |
| 007 | cursor-pagination | Helper pagination cursor-based | Tous les listings |
| 008 | structured-logging | Logger JSON structure | 1.3 |
| 009 | error-handler | Middleware erreurs API standardise | 1.3 |
| 010 | auth-jwt | Generation/verification JWT | 3.1 |
| 011 | auth-2fa | TOTP 2FA flow | 3.1 |
| 012 | rbac | Role-based access control | 3.2 |
| 013 | rls-policies | PostgreSQL RLS policies | 3.2 |
| 014 | file-upload | Upload securise S3-compatible | 4.1, 5.2 |
| 015 | pdf-generation | Generation PDF avec puppeteer/pdfkit | 4.3, 4.4 |
| 016 | facturx-xml | Generation XML Factur-X conforme | 4.4 |
| 017 | email-send | Envoi email transactionnel | 4.2, 4.6 |
| 018 | webhook-handler | Reception webhooks securisee | 6.1, 9.2 |
| 019 | queue-job | Job queue avec BullMQ | 5.3, 5.4 |
| 020 | rate-limiter | Rate limiting par tenant | 1.3 |
| 021 | cache-layer | Cache Redis avec invalidation | 6.2 |
| 022 | api-client | Client HTTP avec retry et circuit breaker | 5.4, 6.1, 8.3 |
| 023 | ocr-pipeline | Pipeline OCR extraction donnees | 5.2 |
| 024 | bank-sync | Synchronisation transactions bancaires | 6.1 |
| 025 | matching-algo | Algorithme rapprochement bancaire | 6.2 |
| 026 | forecast-engine | Moteur previsionnel tresorerie | 6.3 |
| 027 | siret-lookup | Lookup entreprise via SIRET | 8.3 |
| 028 | sepa-generator | Generation fichier SEPA XML | 5.1 |
| 029 | fec-export | Export FEC conforme | 9.1 |
| 030 | stripe-integration | Integration Stripe payments | 9.2 |
| 031 | signature-electronique | Signature eIDAS | 4.2 |
| 032 | cron-scheduler | Taches planifiees recurrentes | 4.6, 7.3 |
| 033 | notification-system | Notifications multi-canal | 4.6, 7.3 |
| 034 | audit-trail | Journal audit immutable | 3.2 |
| 035 | data-encryption | Chiffrement AES-256 donnees sensibles | 3.1, 6.1 |
| 036 | tva-calculator | Calcul TVA multi-taux France | 4.1, 4.3 |
| 037 | document-numbering | Numerotation sequentielle documents | 4.1, 4.3 |
| 038 | workflow-engine | Machine a etats pour documents | 4.2 |
| 039 | search-filter | Filtrage et recherche avancee | Tous les listings |
| 040 | import-export | Import/export CSV, Excel | 2.3, 9.1 |
| 041 | test-factory | Factories de test avec Faker | Tous les tests |
| 042 | test-db | DB de test isolee par suite | Tous les tests |
| 043 | api-test-helper | Helpers pour tests d'integration API | Tous les tests API |
| 044 | responsive-layout | Layout responsive mobile-first | 8.2 |
| 045 | form-builder | Composants formulaire reutilisables | Frontend |
| 046 | data-table | Table de donnees avec tri/filtre/pagination | Frontend |
| 047 | toast-notification | Notifications UI toast | Frontend |
| 048 | modal-dialog | Modales et dialogues | Frontend |
| 049 | date-picker | Selecteur de dates | Frontend |
| 050 | chart-component | Graphiques et KPIs | 8.1 |
| 051 | file-preview | Preview documents (PDF, images) | 4.3, 5.1 |
| 052 | drag-drop | Drag & drop pour upload | 5.2 |
| 053 | infinite-scroll | Scroll infini pour listes longues | Frontend |
| 054 | keyboard-shortcuts | Raccourcis clavier | Frontend |
| 055 | theme-system | Theme clair/sombre | Frontend |
| 056 | i18n | Internationalisation (FR par defaut) | Frontend |
| 057 | onboarding-wizard | Wizard d'onboarding etapes | 8.3 |
| 058 | dashboard-widget | Widgets dashboard configurables | 8.1 |
| 059 | ppf-connector | Connecteur PPF/PDP | 9.3 |
| 060 | openbanking-client | Client Open Banking DSP2 | 6.1 |
| 061 | duerp-generator | Generateur DUERP | 7.1 |
| 062 | rgpd-registry | Registre RGPD | 7.2 |
| 063 | insurance-vault | Coffre-fort assurances | 7.3 |
| 064 | supplier-scraper | Scraping portails fournisseurs | 5.4 |
| 065 | email-parser | Parsing emails pour factures | 5.3 |
| 066 | ml-prediction | Prediction ML tresorerie | 6.3 |
| 067 | health-check | Endpoints sante et metriques | 1.3 |
| 068 | graceful-shutdown | Arret propre des services | 1.3 |

---

## References CDC
- CDC-2.1 : Module Ventes
- CDC-2.2 : Module Achats
- CDC-2.3 : Module Bancaire
- CDC-2.4 : Module Legal et Conformite
- CDC-3.1 : Stack Technologique
- CDC-3.2 : API et Integrations
- CDC-4 : Experience Utilisateur
- CDC-5 : Roadmap
- CDC-6 : Securite
- CDC-7 : Business Model

---

## Chantiers Termines
- [x] Migration PostgreSQL (P0-P6) — tous les modules migres depuis in-memory Maps
- [x] Mise en production (D0-D4) — render.yaml, securite, monitoring, E2E, checklist

## Prochaines Etapes
- [ ] Acheter et configurer le domaine custom (zenadmin.fr)
- [ ] Implementer le service OCR (Python FastAPI)
- [ ] Connecter les vrais providers bancaires (GoCardless sandbox)
- [ ] Connecter Stripe en mode test
- [ ] Implementer les notifications email (Resend/SendGrid)
- [ ] Ajouter le mode sombre (theme system)
- [ ] Tests de performance / charge
- [ ] Backup automatique PostgreSQL (pg_dump quotidien)
