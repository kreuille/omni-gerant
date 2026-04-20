# API Reality vs CLAUDE.md — 2026-04-20

Etat des routes Fastify reellement deployees par rapport a ce qui est documente dans
`CLAUDE.md`. Mis a jour apres le fix QA du 2026-04-20 (PR QA-closeout S1).

## Legende
- `[OK-DOC]` : documente ET existe en code
- `[MISSING-CODE]` : documente mais route 404 (gap)
- `[MISSING-DOC]` : existe mais non documente dans CLAUDE.md
- `[ALIAS]` : route ajoutee comme alias du nom documente vers le nom reel

## Auth (`/api/auth/*`)
- `POST /register` `[OK-DOC]`
- `POST /login` `[OK-DOC]`
- `POST /refresh` `[OK-DOC]`
- `POST /logout` `[OK-DOC]`
- `GET /me` `[MISSING-DOC]`
- `POST /2fa/enable` `[MISSING-DOC]`
- `POST /2fa/confirm` `[MISSING-DOC]`
- `POST /2fa/disable` `[OK-DOC]`
- `POST /2fa/setup` `[ALIAS]` → `/2fa/enable` (CLAUDE.md)
- `POST /2fa/verify` `[ALIAS]` → `/2fa/confirm` (CLAUDE.md)
- `POST /verify-2fa` `[MISSING-DOC]`
- `GET /oauth/google/url` `[MISSING-DOC]` (S3)
- `POST /oauth/google/callback` `[MISSING-DOC]` (S3)

## Devis (`/api/quotes/*`)
- `GET|POST /api/quotes` `[OK-DOC]`
- `GET|PATCH|DELETE /api/quotes/:id` `[OK-DOC]`
- `POST /api/quotes/:id/send` `[OK-DOC]`
- `POST /api/quotes/:id/accept` `[OK-DOC]` (ajoute 2026-04-20, P0-05)
- `POST /api/quotes/:id/sign` `[OK-DOC]` (ajoute 2026-04-20, P0-05)
- `POST /api/quotes/:id/share` `[OK-DOC]` (ajoute 2026-04-20, P0-06)
- `POST /api/quotes/:id/convert` `[OK-DOC]` — accepte status `accepted` OU `signed`
- `POST /api/quotes/:id/duplicate` `[MISSING-DOC]`
- `GET /api/quotes/:id/pdf` `[OK-DOC]` (HTML "PDF", veritable PDF binaire a faire — cf. TODO Puppeteer)
- `GET /api/quotes/:id/timeline` `[MISSING-DOC]`
- `GET /api/share/quote/:token` `[MISSING-DOC]` (route publique)
- `POST /api/share/quote/:token/sign` `[MISSING-DOC]`
- `POST /api/share/quote/:token/refuse` `[MISSING-DOC]`

## Factures (`/api/invoices/*`)
- `GET|POST /api/invoices` `[OK-DOC]`
- `GET|PATCH|DELETE /api/invoices/:id` `[OK-DOC]`
- `POST /api/invoices/:id/finalize` `[MISSING-DOC]`
- `POST /api/invoices/:id/sign` `[MISSING-DOC]` (eIDAS simple)
- `POST /api/invoices/:id/signature/verify` `[MISSING-DOC]`
- `GET /api/invoices/:id/pdf` `[ALIAS]` → `/facturx.pdf` (P0-04, 2026-04-20)
- `GET /api/invoices/:id/facturx` `[ALIAS]` → `/facturx.xml` (P0-03, 2026-04-20)
- `GET /api/invoices/:id/facturx.pdf` `[MISSING-DOC]` (PDF/A-3 Factur-X)
- `GET /api/invoices/:id/facturx.xml` `[MISSING-DOC]`

## Achats / Fournisseurs / Banque
- `/api/purchases` `[OK-DOC]`
- `/api/suppliers` `[OK-DOC]`
- `/api/bank/accounts`, `/transactions`, `/reconciliation`, `/forecast` `[OK-DOC]`
- `/api/purchases/ocr`, `/api/ocr/*` `[MISSING-CODE]` (pilier Python non deploye)

## RH (`/api/hr/*`) — tout `[OK-DOC]`
## Legal (`/api/legal/*`)
- `duerp/*` `[OK-DOC]`
- `duerp/detect-risks` `[OK-DOC]` (fix 500 → renvoie 200 `{detected:[]}` si pas d'achats, 2026-04-20)
- `duerp/risks/:nafCode` `[OK-DOC]` — valide format NAF (P2-09)
- `rgpd/treatments` `[OK-DOC]` (CRUD traitements)
- `rgpd/registry` `[MISSING-DOC]`
- `insurance` `[OK-DOC]`

## Settings (`/api/settings/*`) — refixe 2026-04-20
- `GET|PUT /api/settings/accounting` `[OK-DOC]`
- `GET|PUT /api/settings/payments` `[OK-DOC]`
- `GET|PUT /api/settings/ppf` `[OK-DOC]`
- `GET|PUT /api/settings/connectors` `[OK-DOC]` (ajoute 2026-04-20, P0-10)
- `GET /api/settings` `[OK-DOC]` (recap)

## Accounting (`/api/accounting/*`)
- `GET /api/accounting/fec` `[OK-DOC]` — RBAC owner/admin/accountant (fix P0-09, 2026-04-20)
- `GET /api/accounting/fec/validate` `[MISSING-DOC]`

## Billing (`/api/billing/*`) — S4
- `GET /plans`, `/subscription` `[MISSING-DOC]`
- `POST /checkout`, `/portal`, `/webhook` `[MISSING-DOC]`

## Users / Invitations — S2
- `GET /api/users`, `POST /api/users/invite` `[MISSING-DOC]`
- `GET /api/users/invitations`, `DELETE /api/users/invitations/:id` `[MISSING-DOC]`
- `PATCH /api/users/:id/role`, `DELETE /api/users/:id` `[MISSING-DOC]`
- `POST /api/users/accept-invite`, `GET /api/users/invitation-info/:token` `[MISSING-DOC]`

## Gap critique restant (NON traite dans ce PR)
- **P0-02 / P0-03 / P0-04** : PDF binaire veritable (Puppeteer). Actuellement `/quotes/:id/pdf` renvoie du HTML. `/facturx.pdf` existe (pdf-lib) mais pas validation Factur-X CLI.
- **P0-07** : Service OCR Python (non deploye).
- **P0-13** : Persistence PostgreSQL (actuellement in-memory sauf Prisma partiellement).
- **P1-04** : Wizard onboarding 4 etapes cote frontend.
- **P1-05/06/07/08** : CSP frontend, cookies HttpOnly, blacklist JWT logout, rate-limit login specifique.
- Voir `QA-CLOSEOUT-TODO.md` pour le plan detaille.
