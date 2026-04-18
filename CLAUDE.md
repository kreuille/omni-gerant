# zenAdmin - Regles du Projet

## Vision
Plateforme SaaS "tout-en-un" pour TPE, artisans et auto-entrepreneurs.
Objectif Zero Saisie, Conformite Native (Factur-X 2026), Pilotage Proactif.

## Deploiement Production
- **Frontend** : https://omni-gerant.vercel.app (Vercel) — a renommer
- **API** : https://omni-gerant-api.onrender.com (Render, plan free) — a renommer
- **GitHub** : https://github.com/kreuille/omni-gerant (public) — a renommer
- **Vercel project ID** : prj_rrWWOdvv2q3x6TpkOZLvDTNrPFvF
- **Vercel scope** : arnaudguedou-1634s-projects
- **Render service** : srv-d7fkjk471suc73bccdg0

> **Note** : L'API utilise un stockage **in-memory** (Map). A chaque redeploy Render, les donnees sont effacees (comptes, factures, devis...). Il faudra migrer vers PostgreSQL pour la persistence.

## Stack Technique
- **Frontend** : Next.js 14.2 (App Router), TypeScript strict, Tailwind CSS
- **Backend** : Node.js + Fastify + TypeScript strict (tsx runtime)
- **Database** : In-memory Maps (PostgreSQL 16 + Prisma ORM prevu)
- **AI/OCR** : Python FastAPI + LayoutLM/Donut (prevu)
- **Monorepo** : pnpm workspaces + Turborepo
- **Tests** : Vitest (2514 tests, 68 fichiers) + Playwright E2E (51 tests)

## Structure Monorepo
```
zenadmin/
  apps/
    web/          # Next.js frontend (port 3000)
    api/          # Fastify backend (port 3001)
    ocr/          # Python FastAPI OCR service (prevu)
  packages/
    shared/       # Types partages, utils, Result pattern
    db/           # Prisma schema, migrations, seeds (prevu)
    config/       # ESLint, TSConfig partages
  e2e/            # Tests Playwright E2E
  render.yaml     # Blueprint Render pour l'API
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
- **Templates de postes** pour 161 metiers (tous secteurs NAF)
- Auto-fill des postes depuis code NAF + effectif Pappers
- Detection automatique surveillance medicale renforcee (SMR)
- **WorkforceForDuerp** : service de liaison vers le DUERP (postes, effectifs, alertes formations/visites)
- 9 declencheurs automatiques DUERP (nouveau poste, exposition chimique, travail nuit, etc.)
- Wizard frontend 3 etapes (Postes -> Employes -> Formations)

### 6. Legal & Conformite
- **DUERP V3 complet** : Document Unique d'Evaluation des Risques Professionnels
  - Base de risques pour **161 metiers** couvrant tous les secteurs NAF (A-U) + 6 risques universels
  - 16 fichiers de trades : BTP (26), alimentaire (15), commerce (18), sante (10), tertiaire (12), industrie (14), agriculture (12), transport (10), proprete (8), beaute (4), education (4), hotellerie (6), securite (3), sport (5), divers (14)
  - Matrice conforme 4x4 (gravite 1-4 x frequence 1-4 → score 1-16, 4 niveaux)
  - **Plan d'actions** structure (responsable, delai, budget, suivi)
  - **PAPRIPACT V2** : generation automatique depuis risques high/critical, workflow actions (todo→done→verified), suivi budget par type/priorite
  - **Triggers automatiques** (E8) : detection chimique/equipement dans achats, rappel annuel, accident du travail, prevention doublons
  - **Archivage immutable 40 ans** (E10) : hash SHA-256, chaine de versions, access log, inalterabilite
  - **Formations obligatoires** : 27 formations par secteur (SST, HACCP, CACES, FIMO, CATEC, CQP, BNSSA, etc.) + tracker expiration + matrice employes
  - **EPI par risque** : 31 equipements avec normes EN (gants, casques, harnais, ARI, DVA, tenues feu, etc.)
  - **Veille reglementaire** simplifiee : 6 MAJ seeded, filtre par NAF/secteur, severite info/action_required
  - **Maladies professionnelles** : 8 tableaux RG (57A, 65, 66, 30/30bis, 42, 98, 79, 58)
  - Mise a jour annuelle + 7 rappels + penalites conformite
  - Conservation 40 ans (Loi 2021-1018) + depot dematerialise
  - References legales par secteur
  - **Unites de travail** types pour chaque metier (4-6 UT chacun) + support etablissements Pappers
  - Generation PDF, detection de risques depuis les achats
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
- `GET /api/legal/duerp/risks/:nafCode` - Risques par code NAF (161 metiers)
- `POST /api/legal/duerp/detect-risks` - Detection risques achats
- `GET /api/legal/duerp/:id/pdf` - PDF DUERP
- `POST /api/legal/duerp/autofill` - Auto-fill DUERP (SIRET, NAF)
- `GET /api/legal/duerp/history` - Historique versions
- `GET /api/legal/duerp/triggers` - Triggers non resolus (E8)
- `GET /api/legal/duerp/triggers/history` - Historique complet triggers
- `POST /api/legal/duerp/triggers/:id/resolve` - Resoudre un trigger
- `GET /api/legal/duerp/update-status` - Statut conformite (a jour / recommande / requis)
- `POST /api/legal/duerp/triggers/accident` - Signaler accident du travail
- `POST /api/legal/duerp/triggers/check-purchase` - Detecter risques depuis achat
- `GET/POST /api/legal/rgpd/treatments` - Traitements RGPD
- `GET/POST /api/legal/insurance` - Assurances

### Parametres
- `GET/PUT /api/settings/accounting` - Comptabilite
- `GET /api/settings/accounting/fec` - Export FEC
- `GET/PUT /api/settings/payments` - Paiements
- `GET/PUT /api/settings/ppf` - PPF

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
- **Tests actuels** : 2514 tests unitaires (Vitest, 68 fichiers), 51 tests E2E (Playwright)

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
- `JWT_SECRET` : Cle secrete JWT (min 32 caracteres)
- `CORS_ORIGIN` : URL du frontend autorise

---

## Base de Risques DUERP V3 — 161 metiers

### Architecture fichiers

| Fichier | Trades | Secteurs |
|---------|--------|----------|
| `risk-database-v2.ts` | 11 (base) | BTP, Restaurant, Coiffure, Commerce, Boulangerie, Garage, Aide domicile, Bureau, Pharmacie, Electricien, Plombier |
| `trades-btp.ts` | 15 | Peintre, Menuisier, Carreleur, Macon, Couvreur, Platrier, Charpentier, Chaudronnier, Serrurier, Terrassement, Routes, Solier, Poseur, Ascensoriste, Vitrier |
| `trades-alimentaire.ts` | 15 | Fast-food, Collective, Traiteur, Poissonnerie, Chocolaterie, Commerce alim, Bar, Brasserie, Abattoir, Meunerie, Boucherie... |
| `trades-commerce.ts` | 18 | Carrosserie, Fleuriste, Grande distrib, Opticien, Bijouterie, Station-service, Cycles, Location ski... |
| `trades-sante.ts` | 10 | Ambulancier, Creche, Labo, Medecin, Veterinaire, Dentaire, Imagerie, EHPAD, Prothesiste, Funeraires |
| `trades-tertiaire.ts` | 12 | Auto-ecole, Avocat, Banque, Expert-comptable, Immobilier, Informatique, Assurance, Finance... |
| `trades-industrie.ts` | 14 | Imprimerie, Metallerie, Plasturgie, Bois, Scierie, Soudage, Textile, Recyclage, Papeterie... |
| `trades-agriculture.ts` | 12 | Elevage bovin/porcin/avicole, Viticulture, Maraichage, Cereales, Horticulture, Foret, Paysagiste, Apiculture, Aquaculture, Equin |
| `trades-transport.ts` | 10 | Routier marchandises/voyageurs, Demenagement, Coursier, Taxi, Logistique, Frigorifique, Collecte dechets, Messagerie, Fluvial |
| `trades-proprete.ts` | 8 | Nettoyage bureaux/industriel/vitrerie, Blanchisserie, Pressing, Assainissement, Deratisation, Espaces verts |
| `trades-beaute.ts` | 4 | Esthetique, Onglerie, Tatouage-piercing, Spa |
| `trades-education.ts` | 4 | Ecole, College/Lycee, Formation pro, CFA |
| `trades-hotellerie.ts` | 6 | Hotel, Camping, Gite, Residence tourisme, Auberge jeunesse, Food truck |
| `trades-securite.ts` | 3 | Agent securite, Gardiennage, Cynophile |
| `trades-sport-loisirs.ts` | 5 | Salle sport, Piscine, Moniteur ski, Centre equestre, Parc attractions |
| `trades-divers.ts` | 14 | Studio photo, Evenementiel, Mairie, Police municipale, Pompiers, Fromagerie, Animalerie, Jardinerie, Librairie, Cordonnerie, Toilettage, Serrurerie, Cave a vin, Brocante |

### 6 risques universels (tous les metiers)
Routier, psychosocial, biologique, incendie, chute de plain-pied, electrique.

### Services fonctionnels

| Service | Fichier | Description |
|---------|---------|-------------|
| **Triggers** (E8) | `duerp-trigger.service.ts` | Detection chimique/equipement dans achats, rappel annuel, accident, prevention doublons |
| **PAPRIPACT V2** (E9) | `duerp-papripact-v2.service.ts` | Generation auto depuis risques high/critical, workflow todo→done→verified, budget |
| **Archive 40 ans** (E10) | `duerp-archive.service.ts` | Hash SHA-256, chaine de versions, access log, inalterabilite |
| **Formations** (E11) | `duerp-training-tracker.service.ts` | 27 formations, tracker expiration, matrice employes |
| **EPI + Veille** (E12) | `duerp-ppe-regulatory.service.ts` | 31 EPI normes EN, veille reglementaire simplifiee |

### Bases de donnees complementaires
- **Maladies professionnelles** : 8 tableaux RG (57A, 65, 66, 30/30bis, 42, 98, 79, 58)
- **Formations obligatoires** : 27 formations par secteur (SST, HACCP, CACES, FIMO, CATEC, CQP, BNSSA, DVA, etc.)
- **EPI par risque** : 31 equipements avec normes EN (gants EN 388/374/407, casque EN 397, harnais EN 361, ARI EN 137, DVA EN 300, etc.)
- **Veille reglementaire** : 6 mises a jour seeded (depot DUERP 2026, amiante, CMR, canicule, chutes, RG 103)
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

## Prochaines Etapes
- [x] DUERP complet : 161 metiers, triggers, PAPRIPACT, archive 40 ans, formations, EPI, veille
- [ ] Migrer le stockage in-memory vers PostgreSQL + Prisma
- [ ] Ajouter une vraie base de donnees sur Render (PostgreSQL gratuit)
- [ ] Implementer le service OCR (Python FastAPI)
- [ ] Connecter les vrais providers bancaires (GoCardless sandbox)
- [ ] Connecter Stripe en mode test
- [ ] Implementer les notifications email (Resend/SendGrid)
- [ ] Ajouter le mode sombre (theme system)
- [ ] Tests de performance / charge
