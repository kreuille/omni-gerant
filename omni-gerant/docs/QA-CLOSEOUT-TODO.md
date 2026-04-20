# QA Closeout 2026-04-20 — Plan de fermeture des 57 bugs

Reference : `zenadmin-test-report/RAPPORT-BUGS.md` (57 bugs : 13 P0 / 11 P1 / 9 P2 / 24 P3).

## Etat au 2026-04-20 (PR QA closeout S1)

| ID | Severite | Titre | Etat |
|---|---|---|---|
| P0-01 | P0 | URL API fausse dans CLAUDE.md | **FIXED** (CLAUDE.md, smoke-test.sh, e2e) |
| P0-02 | P0 | PDF devis = HTML degraise | PARTIAL (encore HTML) — voir Sprint 1.A |
| P0-03 | P0 | Factur-X XML 404 | **FIXED** via alias `/facturx` → `/facturx.xml` |
| P0-04 | P0 | PDF facture 404 | **FIXED** via alias `/pdf` → `/facturx.pdf` |
| P0-05 | P0 | Accept/convert devis | **FIXED** (accept, sign, message convert) |
| P0-06 | P0 | Share devis 404 | **FIXED** (POST `/share` genere token) |
| P0-07 | P0 | OCR absent | TODO — service Python separe |
| P0-08 | P0 | 2FA `/setup` `/verify` 404 | **FIXED** via aliases vers `/enable` `/confirm` |
| P0-09 | P0 | FEC 403 owner | **FIXED** (RBAC `accounting:read` owner/admin/accountant) |
| P0-10 | P0 | Settings 404 | **FIXED** (settings.routes enregistre + `/connectors` + `/` recap) |
| P0-11 | P0 | RGPD `/treatments` 404 | DEJA OK (existe en code) — doc mise a jour |
| P0-12 | P0 | DUERP detect-risks 500 | **FIXED** (guard null + try/catch) |
| P0-13 | P0 | Donnees perdues redeploy | TODO — migration PG (infra) |
| P1-01 | P1 | Validation TVA | **FIXED** (whitelist centi-% dans quote.schemas) |
| P1-02 | P1 | Luhn SIRET/SIREN | **FIXED** (`luhnCheck` dans `@zenadmin/shared`) |
| P1-03 | P1 | IBAN MOD-97 | **FIXED** (`ibanCheck` + schema `ibanSchema`) |
| P1-04 | P1 | Wizard onboarding | TODO — UI 4 etapes |
| P1-05 | P1 | CSP frontend | TODO — next.config.mjs headers |
| P1-06 | P1 | Tokens en localStorage | TODO — migration cookies HttpOnly |
| P1-07 | P1 | JWT valide apres logout | TODO — blacklist jti |
| P1-08 | P1 | Rate-limit login specifique | TODO |
| P1-09 | P1 | XSS stocke | TODO — sanitization serveur + escape PDF |
| P1-10 | P1 | Message login trompeur API froide | TODO |
| P1-11 | P1 | camelCase HR employees | TODO verifier |
| P2-01 | P2 | `/devis` 404 | TODO redirections |
| P2-02 | P2 | Dashboard vide sans CTA | TODO EmptyState |
| P2-03 | P2 | Warning profil non actionnable | TODO |
| P2-04 | P2 | Sidebar "Dashboard" | **FIXED** → "Tableau de bord" |
| P2-05 | P2 | `€` vs `EUR` | PARTIAL |
| P2-06 | P2 | `address` string vs object | TODO |
| P2-07 | P2 | `company_name` min 1 char | TODO schema |
| P2-08 | P2 | Erreurs Zod EN | TODO `zod-i18n-map` |
| P2-09 | P2 | NAF accepte "XX" | **FIXED** (regex `^\d{2}\.\d{2}[A-Z]$` + 400 `INVALID_NAF_CODE`) |
| P3-* | P3 | 24 accents manquants | **FIXED** (57 edits / 28 fichiers) |

## Score
- **P0 fermes** : 10/13 (77 %)
- **P1 fermes** : 3/11 (27 %)
- **P2 fermes** : 2/9 (22 %)
- **P3 fermes** : 24/24 (100 %)
- **Total fermes** : 39/57 (68 %)

## Gros chantiers restants (planifier en sprints suivants)

### Sprint 1.A — PDF reel (2-3 j)
- Installer `puppeteer-core` + `@sparticuz/chromium-min` (Render slug limit)
- Service `packages/pdf-service/` (template EJS/React -> Buffer)
- `/quotes/:id/pdf` : rendre en vrai PDF
- `/legal/duerp/:id/pdf` : idem
- CI : valider Factur-X via `facturx-validator` CLI

### Sprint 1.B — OCR (3-5 j)
- Deployer le service Python `apps/ocr/` (FastAPI + pytesseract ou Donut)
- `/api/purchases/ocr` proxy
- Tests e2e d'upload + extraction

### Sprint 1.C — Persistence PG (1-2 j)
- `render.yaml` : ajouter service `postgresql` free 1 GB
- Migrer TOUS les `new Map<>()` vers Prisma repos reels
- Tests : re-login apres redeploy conserve l'utilisateur

### Sprint 2 — Securite (2-3 j)
- CSP frontend (`next.config.mjs`)
- Tokens cookies HttpOnly + CSRF token
- Blacklist JWT `jti` en logout (Map TTL=exp)
- Rate-limit login specifique (max 5 / email+IP / 1 min)
- Sanitization XSS sur champs libre (`notes`, `company_name`)

### Sprint 3 — UX/i18n (1-2 j)
- Wizard onboarding 4 etapes (SIRET lookup -> activite -> coordonnees -> validation)
- Redirections `/devis`, `/factures`, `/achats`, `/banque`, `/effectif`, `/parametres`
- `EmptyState` dashboard
- `zod-i18n-map` locale `fr`
- Harmonisation `€`
- `tenant.address` objet structure partout
