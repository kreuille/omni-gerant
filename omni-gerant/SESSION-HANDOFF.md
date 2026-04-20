# zenAdmin / omni-gerant — Session handoff

> Copie-colle ce fichier dans une nouvelle session Claude Code pour reprendre
> automatiquement le travail la ou on s'est arrete.

---

## Instructions pour la nouvelle session

**Tu es Claude Code. Tu reprends le projet zenAdmin en cours.**

### Etat actuel

- **Worktree** : `C:\Users\Arnau\OneDrive\Documents\admin_tools\.claude\worktrees\angry-visvesvaraya-829db4\omni-gerant`
- **Branche** : `claude/angry-visvesvaraya-829db4`
- **GitHub** : https://github.com/kreuille/zenadmin
- **Dernier PR merge** : #92 (commit `main` = `60e9f538`)
- **Deploiements** : https://omni-gerant.vercel.app (Vercel) + https://omni-gerant-api.onrender.com (Render) — auto-deploy depuis `main`

### Mode operatoire (NON NEGOCIABLE)

A chaque vague tu fais DANS CET ORDRE, SANS ME DEMANDER :

1. **Code** les 2 ou 3 items de la vague (modele Prisma + routes + service)
2. **Enregistre** les nouvelles routes dans `apps/api/src/app.ts`
3. **TypeScript check** :
   ```bash
   cd apps/api && npx tsc --noEmit 2>&1 | grep -v "TS6133\|TS6192\|TS6196" | grep "<module>"
   ```
   Les erreurs TS6133/6192/6196 (unused imports/variables) sont PRE-EXISTANTES et toleeees.
4. **CHANGELOG.md** : ajoute une section `### Vague X — Titre` en haut de `[Unreleased]`
5. **Commit** conventionnel :
   ```
   feat: Vague X — titre court

   X1 ...
   X2 ...
   X3 ...

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   ```
6. **Push + PR + merge** :
   ```bash
   git push
   gh pr create --base main --title "feat: Vague X — ..." --body "..."
   gh pr merge --merge --admin
   git fetch origin main && git log origin/main --oneline -1
   ```
7. **Passe a la vague suivante** sans demander confirmation.

### Regles techniques (rappel CLAUDE.md)

- **R01** `Result<T, E>` pattern, jamais d'exception metier
- **R02** Montants en centimes (int), jamais de float
- **R05** TypeScript strict, pas de `any` non justifie
- **R08** Validation Zod aux frontieres, messages d'erreur **en francais**
- **R13** Erreurs API `{ error: { code, message, details } }`
- Soft delete (`deleted_at`) pour tous les modeles metier
- `tenant_id UUID` sur chaque table + index composite
- Register les nouvelles routes via `await app.register(xxxRoutes)` dans `app.ts`
- Les modeles Prisma peuvent etre ajoutes en append a `packages/db/prisma/schema.prisma` — Render fait `prisma db push` au deploy
- Pour les champs `BigInt` Prisma, utiliser cast `any` quand le client n'a pas encore ete regenere

### Deploy

Render (API Node + PG) et Vercel (Next web) redeploient automatiquement apres merge dans `main`. Pas besoin d'action manuelle.

Variables d'env critiques deja configurees (confirme-les si tu ajoutes des features qui en ont besoin) :
- `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `HOST`, `PORT`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` (optionnel)
- `RESEND_API_KEY`, `EMAIL_FROM` (optionnel, sinon console)
- `OPENAI_API_KEY` (optionnel, sinon fallback heuristique)
- `OVH_SMS_*` ou `TWILIO_*` (optionnel, sinon console)
- `BRIDGE_CLIENT_ID`, `BRIDGE_CLIENT_SECRET` (optionnel)
- `CRON_SECRET` (pour /api/jobs/tick)
- `APP_BASE_URL` = https://omni-gerant.vercel.app
- `APP_URL` = https://omni-gerant.vercel.app

---

## Historique des 17 vagues livrees cette session

| PR | Vague | Titre | Commit merge |
|---|---|---|---|
| #75 | — | QA closeout 57/57 (cookies HttpOnly + CSRF + completeness badge) | `5c28c2f4` |
| #76 | B | Bank sync + reconciliation | `bf4223d0` |
| #77 | C | eIDAS + PWA + RGPD Art.20 | `c18bff01` |
| #78 | D | Stripe Connect + DSN + PWA mobile + CI + obs + multi-devise | `50ba50c7` |
| #79 | E | E2E + Sentry + IA categorisation | `a70b9aec` |
| #80 | F | Templates + SMS + signature tactile | `77ca7f7b` |
| #81 | G | Import CSV + variantes + Pennylane | `eb32f288` |
| #82 | H | Analytics + pipeline CRM + agenda iCal | `c14f9dc9` |
| #83 | I | WebAuthn + portail client + webhooks sortants | `9af90b59` |
| #84 | J | Booking RDV + NPS + IA generation devis | `8d2dc623` |
| #85 | K | Audit trail v2 + archivage fiscal 10 ans + 2FA email | `17f6148e` |
| #86 | L | Multi-entrepots + e-commerce public + kanban taches | `f1252685` |
| #87 | M | IA insights + assistant chat | `9cfa9e1e` |
| #88 | N | Declaration TVA CA3 + bilan simplifie | `5fe8f4fe` |
| #89 | O | HR conges + notes de frais + indemnites km URSSAF | `47894fa5` |
| #90 | P | Contrats + alertes renouvellement + docs legaux | `d82cd388` |
| #91 | Q | Support ticketing + SLA + macros | `b4e82778` |
| #92 | R | Marketing segments + campagnes + parrainage | `60e9f538` |

Historique detaille dans `omni-gerant/CHANGELOG.md`.

---

## Vagues prochaines a executer (ordre suggere)

### Vague S — Gestion de projet
- **S1** Timesheets : employes pointent leur temps par projet, tarification au taux horaire
- **S2** Projets : `Project` model (client, budget, phases, statut), KPIs temps/budget
- **S3** Facturation au temps : transforme des timesheets en lignes de facture

### Vague T — Multi-societes
- **T1** Holding : plusieurs tenants lies a une meme entite mere, role `holding_admin`
- **T2** Consolidation : analytics agregees cross-tenant (CA holding, depenses consolidees)
- **T3** Transferts inter-societes : facturation interne auto

### Vague U — Fidelisation
- **U1** Programme points : `LoyaltyAccount` par client, points gagnes par facture payee
- **U2** Niveaux et recompenses : bronze/silver/gold/platinum, reduction auto
- **U3** Coupons temporaires : codes reduc a durees / usages limites

### Vague V — Inventaire mobile
- **V1** Endpoint scanner : `POST /api/stock/scan` accepte code-barre EAN, matche variant
- **V2** Bons de reception : `StockReceipt` lie a un achat, auto-increment stock
- **V3** Inventaires tournants : cycles comptage physique, ecarts traces

### Vague W — Service apres-vente
- **W1** Retours client : `ReturnAuthorization` (RMA-YYYY-NNNN), motif, etat produit
- **W2** Avoirs : `CreditNote` lie a facture, emission auto depuis un RMA valide
- **W3** Garanties : `Warranty` par produit/vente, expiration, extension

### Vague X — Conformite sectorielle
- **X1** HACCP (restauration) : tracabilite DLC, temperatures, fiches sanitaires
- **X2** Decennale BTP : auto-check assurance decennale par chantier
- **X3** Registre unique du personnel (obligation L1221-13 Code travail)

### Vague Y — API publique
- **Y1** OpenAPI 3.1 spec auto-generee depuis les schemas Zod
- **Y2** API keys : `ApiKey` model, rate-limit par key, scopes granulaires
- **Y3** SDK TypeScript genere + publie sur npm

### Vague Z — White-label
- **Z1** Multi-domaine : `tenant.custom_domain`, CNAME Vercel auto
- **Z2** Branding : logo, couleurs, fontes par tenant (appliques cote PDF + email)
- **Z3** Revendeur : role `reseller` qui peut creer des sous-tenants

---

## Commande de reprise

**Colle ceci en debut de nouvelle session** :

```
Reprends le projet zenAdmin. Lis d'abord le fichier SESSION-HANDOFF.md a la
racine du repo, puis continue avec la Vague S sans me demander, en suivant
le mode operatoire decrit. Enchaine S puis T puis U... jusqu'a Z ou jusqu'a
ce que je te dise stop.
```

ou plus direct :

```
Continue le projet zenAdmin en mode autonome. SESSION-HANDOFF.md contient
tout le contexte. Lance la Vague S maintenant et enchaine sans demander.
```

---

## Verifications rapides en debut de session

```bash
cd "C:\Users\Arnau\OneDrive\Documents\admin_tools\.claude\worktrees\angry-visvesvaraya-829db4\omni-gerant"
git fetch origin
git log origin/main --oneline -5
git branch --show-current
head -60 CHANGELOG.md
```

Si le dernier commit main est `60e9f538` ou plus recent, tu es aligne. Sinon
regarde ce qui a change depuis et adapte.

---

## Notes importantes

- **`apps/api` a plusieurs centaines d'erreurs TS pre-existantes** (TS6133/6192/6196 unused imports/vars + quelques `any`-compat). Elles sont tolereees par le runtime `tsx` utilise en prod. NE PAS chercher a toutes les fix — filtre-les toujours dans les TS checks.
- **Les modeles Prisma sont appendes au schema** sans migration explicite. Render fait `prisma db push` au build ; c'est tolerant mais pour un nouveau model il faut que la DB l'accepte sans perte de donnees.
- **Pour les modeles Prisma nouveaux**, utiliser le pattern cast `any` :
  ```typescript
  await (prisma as unknown as { monNouveauModel?: { create?: Function } })
    .monNouveauModel?.create?.({ data: ... });
  ```
  Le client Prisma peut ne pas avoir regenere en local, ce pattern survit a la regeneration sans changer le code.
- **Le CORS backend** accepte uniquement les origins de `CORS_ORIGIN` separes par virgule.
- **Les cookies HttpOnly** sont en `SameSite=None; Secure` en prod (cross-origin Vercel -> Render). Mode dev = `SameSite=Lax` sans secure.

---

## Contact

Si tu as un doute sur une vague ou un endpoint, demande a l'utilisateur. Sinon
execute en autonomie.

Bon code !
