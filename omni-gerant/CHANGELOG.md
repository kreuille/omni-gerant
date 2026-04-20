# Changelog zenAdmin

Toutes les modifications notables de ce projet sont documentees ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnage : [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Vague Y — API publique
- **Y1 OpenAPI 3.1** : `GET /api/openapi.json`, `/api/openapi.yaml`,
  `/api/docs` (Swagger UI embarque) exposent la spec de l'API publique v1.
- **Y2 API Keys** : `ApiKey` (key_prefix + SHA-256 hash, scopes granulaires,
  rate_limit_per_min, expires_at), `ApiKeyUsage` bucket par minute pour
  rate limit + metriques. Endpoints CRUD + `/revoke` + `/usage` (stats 24h).
- **Y3 API v1** : `/api/v1/clients`, `/invoices`, `/quotes`, `/whoami`
  avec auth Bearer zen_live_ + verification de scope (read:*, write:*, *),
  pagination cursor, rate limit applique.
- **Fix schema** : remplacement `10_000` par `10000` dans `LoyaltyTier`
  (underscore numeric separator non supporte par Prisma — bloquait le
  deploy Render).

### Vague X — Conformite sectorielle
- **X1 HACCP (restauration)** : `HaccpRecord` (temperature/cleaning/delivery/
  expiration/oil_change), auto-check conformite (temperature hors seuils
  → is_compliant=false, DLC passee → idem), `GET /api/compliance/haccp/alerts`
  liste produits <7j DLC + non-conformites <7j.
- **X2 Decennale BTP** : `BtpChantier` CHT-YYYY-NNN avec work_type, budget,
  `decennale_required` + auto-check contre `InsurancePolicy type=decennale`
  active couvrant la periode chantier. `POST /:id/check-decennale` ferme
  replay, `GET /api/compliance/chantiers/alerts` liste chantiers non
  couverts.
- **X3 Registre unique du personnel** : deja expose via `/api/hr/registry`
  (vague O1, append-only conforme Article L1221-13).

### Vague W — Service apres-vente (SAV)
- **W1 Retours client (RMA)** : `ReturnAuthorization` RMA-YYYY-NNNN +
  `ReturnLine`, workflow pending → approved → received → refunded.
  Reception re-integre le stock des lignes `restock=true` via StockMovement.
- **W2 Avoirs** : `POST /api/sav/returns/:id/credit-note` cree une
  `Invoice type=credit_note` numero AV-YYYY-NNNNN avec montants negatifs,
  met a jour RMA.status=refunded et credit_note_id.
- **W3 Garanties** : `Warranty` (standard/extended/manufacturer) avec
  duration_months + starts_at → ends_at calcule, endpoint `/extend`
  (ajoute des mois, kind devient extended) et `/check?serial_number=`
  verifie la validite.

### Vague V — Inventaire mobile
- **V1 Scanner** : `POST /api/stock/scan` — match SKU variant, fallback
  reference produit, retour stock_qty pour l'app mobile.
- **V2 Bons de reception** : `StockReceipt` BR-YYYY-NNNN + lignes,
  auto-increment `variant.stock_qty` + `WarehouseStock` + creation
  `StockMovement` direction=in, statut received|partial selon ecart
  expected/received.
- **V3 Inventaires tournants** : `InventoryCount` INV-YYYY-NNNN, generation
  auto des lignes depuis variantes actives, endpoint `/count` pour saisir,
  `/apply` qui met a jour `variant.stock_qty` + cree `StockMovement` adjust
  pour chaque ecart non nul.

### Vague U — Fidelisation
- **U1 Programme points** : `LoyaltyAccount` par client + `LoyaltyTransaction`
  (earn/redeem/adjust/expire). Endpoint auto-credit depuis facture payee
  (`POST /api/loyalty/earn/invoice/:id`), multiplicateur par tier.
- **U2 Niveaux** : `LoyaltyTier` bronze (0pts)/silver (500pts, 3% + x1.25)/
  gold (2000pts, 6% + x1.5)/platinum (5000pts, 10% + x2), seed automatique
  au 1er appel `/api/loyalty/tiers`.
- **U3 Coupons** : `Coupon` (percent/amount/free_shipping) avec
  max_uses, max_uses_per_client, valid_from/until, `CouponRedemption`.
  `GET /api/public/coupons/:code` verification + `POST /api/loyalty/coupons/redeem`.

### Vague T — Multi-societes (holding)
- **T1 Holding** : `HoldingGroup` (name, siren, parent_tenant_id) +
  `HoldingMembership` (role parent/subsidiary/joint_venture + ownership_bp) +
  `HoldingAdminAccess` (cross-tenant, role holding_admin/viewer).
  Createur auto holding_admin. Endpoints CRUD holding + members.
- **T2 Consolidation** : `GET /api/holding/:id/consolidation?from&to` —
  CA, TTC, paid, depenses par tenant membre + totaux holding + marge
  ponderee par ownership_bp.
- **T3 Transferts inter-societes** : `IntercompanyTransfer` model,
  `POST /api/holding/:id/transfers` + `/execute` qui cree la facture cote
  emetteur (avec creation auto client "interco") + purchase cote recepteur
  (avec creation auto supplier), marque le transfert `mirrored`.

### Vague S — Gestion de projet
- **S1 Timesheets** : `TimeEntry` (user/project/phase/date/minutes/hourly_rate),
  workflow draft → submitted → approved → invoiced, CRUD +
  `/api/timesheets/{id}/{submit,approve,reject}` + `/api/timesheets/summary`
  (aggregats by_user/by_project/by_status).
- **S2 Projets** : `Project` (client/manager/code PRJ-YYYY-NNN/budget/phases JSON/
  default_hourly_rate/status active|on_hold|completed|cancelled), CRUD +
  `/api/projects/:id/kpis` (budget consume, logged/invoiced minutes, to_invoice).
- **S3 Facturation au temps** : `POST /api/projects/:id/invoice` transforme
  les time entries approuves en facture (ligne par projet/phase/user/day au choix),
  cree l'Invoice + InvoiceLines, marque les entries `invoiced`, incremente
  `spent_cents` + `invoiced_minutes` du projet.

### Vague R — Marketing
- **R1** `MarketingSegment` + filtres JSON + endpoint preview.
- **R2** `MarketingCampaign` email+SMS, send direct avec Resend/OVH/Twilio,
  variable `{{name}}`.
- **R3** `ReferralCode` avec reward_cents, max_uses, expires_at,
  `GET /api/public/referrals/:code` verification.

### Vague Q — Support ticketing
- **Q1** `SupportTicket` TCK-NNNNNN + SLA auto par priorite (1-48h / 8-240h).
- **Q2** `SupportMessage` agent/requester/system + is_internal + first_responded_at.
- **Q3** `SupportMacro` reponses pre-ecrites + `/api/support/sla/summary`.

### Vague P — Contrats & documents legaux
- **P1 Contrats** : `Contract` (CTR-YYYY-NNNNN, kind service/nda/cgv/
  maintenance/employment), CRUD + signature hash-chain SHA-256,
  `GET /api/contracts/renewals/upcoming`.
- **P2 Renewal alerts** : cron `contract-renewal` 1x/jour — notification
  warning 30-60j avant, danger <= 15j, distingue auto-renew.
- **P3 Bibliotheque legale** : `LegalDocument` (CGV/CGU/mentions_legales/
  politique_confidentialite/cookies), versionnage + is_current unique par
  kind, `GET /api/public/legal/:tenantId/:kind` pour exposition publique.

### Vague O — HR avancee
- **O1 Conges** : `LeaveRequest` + `LeaveBalance`, workflow
  pending/approved/refused, comptage jours ouvrables, mise a jour auto
  du solde CP a l'approbation.
- **O2 Notes de frais** : `ExpenseClaim` (NDF-YYYY-NNNNN), 6 categories,
  workflow pending/approved/reimbursed, TVA deductible calculee.
- **O3 Indemnites kilometriques** : `MileageLog` + bareme URSSAF 2024
  (3-7 CV, 3 tranches <= 5000 / 5-20k / > 20k km), endpoint de calcul
  de taux preview.

### Vague N — Reporting fiscal
- **N1** `GET /api/accounting/vat/declaration?from=&to=` — CA3 TVA ventilee
  par taux FR + net a payer / credit.
- **N2** `GET /api/accounting/balance-sheet?from=&to=` — bilan simplifie
  pedagogique (NON officiel).

### Vague M — IA & Insights
- **M1 Insights** : `GET /api/ai/insights` — clients a risque (3+ factures
  retard), anomalies CA (z-score), prediction CA mois suivant (moyenne mobile
  3 mois), concentration client >30 %, DSO > 45j.
- **M2 Assistant IA** : `POST /api/ai/chat` via OpenAI gpt-4o-mini, system
  prompt expert TPE France.

### Vague L — Business Tools
- **L1 Multi-entrepots** : `Warehouse` + `WarehouseStock` par emplacement,
  defaut unique, `POST /api/warehouses/transfer` atomique entre entrepots
  (Prisma $transaction).
- **L2 E-commerce public** : `PublicCatalogConfig` (slug, couleur, produits
  publies) + `PublicOrder`, `GET /api/public/catalog/:slug` + panier +
  Stripe Checkout automatique pour la commande.
- **L3 Kanban taches** : `Task` (board, status todo/doing/done, priority
  low/medium/high/urgent, assignee, labels, liens client/devis/facture),
  `/api/tasks/reorder` pour drag & drop.

### Vague K — Compliance & Archivage
- **K1 Audit trail v2** : `AuditEvent` append-only (correlation_id, metadata
  JSON, indexes tenant+created_at+resource). `logAuditEvent()` helper
  best-effort. `GET /api/audit/events`.
- **K2 Archivage fiscal 10 ans** : `FiscalArchive` avec chaine SHA-256
  (chain_hash = SHA256(prev + doc_hash)). `archiveDocument()` idempotent +
  `verifyArchiveChain()` pour audit d'integrite.
- **K3 2FA email** : `EmailOtpChallenge` code 6 chiffres valide 10 min,
  max 5 tentatives, envoi via Resend/Console. Endpoints
  `POST /api/auth/otp/request` + `/verify`.

### Vague J — Experience client avancee
- **J1 Booking** : modele `BookingSlotConfig` + `Booking`, config avec
  `availability` JSON par jour, calcul automatique des creneaux libres sur
  14j, endpoint public `/api/public/booking/:slug`, booking + annulation par
  token. Genere automatiquement un `CalendarEvent` lie avec rappel 15min.
- **J2 NPS** : `POST /api/public/nps` (token-less), `GET /api/nps/summary`
  (promoteurs / passifs / detracteurs + score -100..+100).
- **J3 IA devis** : `POST /api/quotes/ai-generate` prompt FR -> lignes
  structurees (OpenAI gpt-4o-mini si `OPENAI_API_KEY` sinon fallback
  heuristique). Respect whitelist TVA P1-01.

### Vague I — Securite avancee & Integration (PR #83)
- **I1 WebAuthn/FIDO2** : 6 endpoints (options + verify pour register/login),
  cookies HttpOnly comme login classique, compteur + last_used_at.
- **I2 Portail client** : magic link `/portal/client/:token`, download PDF
  devis/facture, paiement Stripe Checkout (Connect-aware).
- **I3 Webhooks sortants** : outbox pattern, HMAC SHA-256, retry exp backoff
  30s→24h, 12 event types, CRUD endpoints + historique + retry manuel,
  cron 1x/min.

### Vague H — Pilotage & CRM (PR #82)
- **H1** Analytics : P&L mensuel 12 mois + cash-flow previsionnel 90j + DSO/DPO
  + top 5 clients/fournisseurs. `GET /api/dashboard/analytics`.
- **H2** Pipeline CRM : kanban 8 colonnes + stats conversion + win/loss YTD.
  `GET /api/quotes/pipeline`.
- **H3** Agenda : `CalendarEvent`, CRUD, export iCal RFC 5545, cron rappels.

### Vague G — Data & Integrations (PR #81)
- **G1** Import CSV clients/produits (parser RFC 4180, templates DL).
- **G2** `ProductVariant` + `StockMovement` + alerte low-stock.
- **G3** Export Pennylane / Dougs JSON normalise.

### Vague F — Productivite (PR #80)
- **F1** `QuoteTemplate` reutilisable.
- **F2** SMS OVH + Twilio + console fallback.
- **F3** Signature tactile refactor (lissage Bezier + pression par velocite).

### Vague E — Quality & Intelligence (PR #79)
- **E1** Tests E2E Playwright critical path.
- **E2** Sentry SDK-less (envelope v7 fetch direct).
- **E3** IA categorisation achats (17 regles + OpenAI fallback).

### Vague D — Ship-ready (PR #78)
- **D1** Stripe Connect (payment-link sur facture).
- **D2** DSN mensuelle auto.
- **D3** PWA mobile (bottom nav + install prompt).
- **D4** CI GitHub Actions + k6.
- **D5** Observabilite (slow requests + error envelopes).
- **D6** Multi-devise EUR/USD/GBP/CHF.

### Vague C — Production polish (PR #77)
- **C1** Signature eIDAS SES avec proof chain SHA-256.
- **C2** PWA manifest + service worker.
- **C3** Export RGPD Art.20 (droit a la portabilite).

### Vague B — Bank (PR #76)
- Bank sync quotidien + reconciliation automatique + notifications paiement.

### QA Closeout (PR #75)
- 57/57 bugs du rapport QA 2026-04-20 fermes (100 %).
- Cookies HttpOnly + CSRF double-submit.
- Completeness badge profil entreprise.
