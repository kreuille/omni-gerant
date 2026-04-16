# Bug Fix Prompts B0-B3 — zenAdmin

> Corriger les bugs identifies dans BUG-REPORT-OMNI-GERANT.md.
> Ordre : critiques (B0) → majeurs (B1, B2) → mineurs (B3).

---

## B0 — Persistence devis/factures + Calcul TVA (CRITIQUE)

Lis `.claude/skills/000-dev-rules/SKILL.md`.
Lis `apps/api/src/modules/quote/quote.service.ts`, `apps/api/src/modules/quote/quote.routes.ts`, `apps/api/src/modules/invoice/invoice.service.ts` et `apps/api/src/modules/quote/quote-calculator.ts`.

### Bug PERSIST-001-008 : Devis et factures disparaissent apres creation

**Symptome** : POST /api/quotes retourne 201 avec ID, mais GET /api/quotes retourne 0 resultats et GET /api/quotes/:id retourne 404.

**Cause probable** : Incoherence du tenant_id entre l'ecriture et la lecture. Le service filtre par tenant_id lors de la lecture, mais le tenant_id assigne a la creation ne correspond pas a celui injecte par le middleware auth.

**Verification** :
1. Lis le middleware d'authentification (`auth.plugin.ts` ou equivalent) pour voir comment `tenant_id` est injecte dans la requete
2. Lis `quote.service.ts` pour voir comment `tenant_id` est utilise a la creation (create) vs a la lecture (list/getById)
3. Compare avec `supplier.service.ts` ou `insurance.service.ts` (qui fonctionnent correctement) pour trouver la difference

**Fix** : Aligner la source du tenant_id entre creation et lecture. Le tenant_id doit venir du meme endroit (typiquement `request.tenantId` injecte par le middleware auth) dans les deux cas.

**Attention** : Ce bug affecte probablement aussi `invoice.service.ts` (meme pattern). Corriger les deux.

### Bug CALC-002 + CALC-003 : TVA 100x trop faible

**Symptome** : Pour une ligne a 450 EUR HT (45000 centimes) avec TVA 20%, la TVA retournee est 270 centimes (2.70 EUR) au lieu de 27000 centimes (270 EUR).

**Cause** : Le `tva_rate` est stocke en points de base dans certains endroits (2000 = 20%) mais l'API recoit des valeurs en pourcentage (20). La formule `tvaCents = Math.round((adjustedHt * rate) / 10000)` est correcte si rate=2000, mais l'API envoie rate=20.

**Fix** :
1. Decider d'un format unique pour tva_rate dans TOUT le code : **pourcentage** (20, 10, 5.5, 2.1)
2. Adapter le calculateur :
   - Si rate en pourcentage : `tvaCents = Math.round(adjustedHt * rate / 100)`
   - Verifier que le meme format est utilise partout : schemas Zod, service, routes, tests
3. Ajouter un guard : `if (rate > 100) throw new Error('TVA rate seems in basis points, expected percentage')`

**Tests B0** :
1. Creer un devis → le retrouver par GET /api/quotes → present
2. Creer un devis → le retrouver par GET /api/quotes/:id → present
3. Creer une facture → la retrouver par GET /api/invoices → present
4. Creer une facture → la retrouver par GET /api/invoices/:id → present
5. Tenant isolation : devis du tenant A invisible pour le tenant B
6. TVA 20% sur 45000 centimes HT → 9000 centimes TVA (pas 90)
7. TVA 5.5% sur 10000 centimes HT → 550 centimes TVA
8. TVA multi-taux : 3 lignes a 20% + 10% + 5.5% → totaux corrects
9. TTC = HT + TVA pour tous les cas ci-dessus
10. 0 regression

Commit : `fix(ventes): B0 fix tenant_id persistence and TVA calculation`

---

## B1 — Routes manquantes + RBAC Dashboard (MAJEUR)

Lis `.claude/skills/000-dev-rules/SKILL.md`.
Lis `apps/api/src/app.ts` pour voir les plugins Fastify enregistres.
Lis `apps/api/src/modules/auth/rbac/permissions.ts` (ou equivalent).

### Bug ROUTE-404 : 5 routes documentees retournent 404

**Routes manquantes** :
- GET /api/clients
- GET /api/products
- GET /api/settings/accounting
- GET /api/settings/payments
- GET /api/settings/ppf

**Cause probable** : Ces modules existent dans le code mais ne sont pas enregistres comme plugins Fastify dans `app.ts`.

**Fix** :
1. Verifier que les fichiers routes existent pour chaque module (client.routes.ts, product.routes.ts, settings/*.routes.ts)
2. S'ils existent : les enregistrer dans `app.ts` avec `app.register()`
3. S'ils n'existent pas : creer les routes minimales (CRUD basique avec le service existant)
4. Verifier que chaque route repond correctement (au moins un 200 pour GET et pas de 404)

### Bug RBAC-001 : Owner ne peut pas acceder au dashboard

**Symptome** : GET /api/dashboard avec un token "owner" → 403 Forbidden.

**Fix** :
1. Trouver la matrice de permissions RBAC
2. Ajouter la permission `dashboard:read` (ou equivalent) pour le role `owner`
3. Le role `owner` doit avoir TOUTES les permissions (c'est le super-admin)

### Bug BANK-001 : POST /api/bank/accounts → 404

**Fix** : Ajouter la route POST dans les routes banque. Verifier que le service bank a une methode `create`.

**Tests B1** :
1. GET /api/clients → 200 (pas 404)
2. GET /api/products → 200
3. GET /api/settings/accounting → 200
4. GET /api/settings/payments → 200
5. GET /api/settings/ppf → 200
6. GET /api/dashboard avec role owner → 200 (pas 403)
7. GET /api/dashboard avec role admin → 200
8. GET /api/dashboard avec role member → 200
9. POST /api/bank/accounts → 201 (pas 404)
10. 0 regression

Commit : `fix(api): B1 register missing routes and fix RBAC owner permissions`

---

## B2 — Workflows + Validation + SIRET (MAJEUR)

Lis `.claude/skills/000-dev-rules/SKILL.md`.
Lis `apps/api/src/modules/quote/quote.routes.ts` et `apps/api/src/modules/legal/duerp/duerp.routes.ts`.
Lis `apps/api/src/lib/siret-lookup.ts`.

### Bug WF-011 : Impossible d'envoyer un devis

**Symptome** :
- POST /api/quotes/:id/send avec body vide → "Body cannot be empty when content-type is set to application/json"
- POST /api/quotes/:id/send avec body → 404 (consequence de PERSIST, doit etre corrige apres B0)

**Fix** :
1. Rendre le body optionnel dans le schema Zod de la route /send (ou accepter `{}`)
2. Dans la config Fastify de la route, ajouter `{ schema: { body: z.object({}).optional() } }`
3. Verifier que la route /duplicate a le meme probleme et le corriger aussi

### Bug DUERP-020 : Creation DUERP echoue

**Symptome** : POST /api/legal/duerp avec body conforme → erreur de validation (champ `evaluator_name` manquant).

**Fix** :
1. Lire le schema Zod de creation DUERP
2. Rendre `evaluator_name` optionnel OU l'ajouter a la documentation API
3. Si optionnel : mettre une valeur par defaut (nom du user connecte)
4. Verifier que la creation DUERP complete fonctionne de bout en bout

### Bug SIRET-001 : Lookup SIRET → 503

**Symptome** : GET /api/lookup/siret/:siret → 503 Service Unavailable.

**Cause** : L'API data.gouv.fr n'est pas joignable depuis Render. Pas de fallback.

**Fix** : Le prompt 11.1 a deja implemente la cascade Pappers → SIRENE → data.gouv.fr dans `siret-lookup.ts`. Verifier :
1. Que la cascade est bien active (pas juste data.gouv.fr)
2. Que les clients Pappers et SIRENE sont instancies meme sans cles API (mode degrade avec data.gouv.fr en dernier)
3. Ajouter un try/catch avec timeout de 5s par source
4. Si toutes les sources echouent : retourner une erreur claire `SIRET_LOOKUP_UNAVAILABLE` (pas 503 generique)

**Tests B2** :
1. POST /api/quotes/:id/send avec body vide → pas d'erreur "body cannot be empty"
2. POST /api/quotes/:id/send avec body → envoi reussi (apres fix B0)
3. POST /api/legal/duerp sans evaluator_name → creation reussie
4. POST /api/legal/duerp avec evaluator_name → creation reussie
5. GET /api/lookup/siret/INVALID → erreur propre (pas 503)
6. Cascade SIRET : si source 1 echoue, source 2 est tentee
7. 0 regression

Commit : `fix(api): B2 fix quote send workflow, DUERP validation and SIRET cascade`

---

## B3 — Navigation + UI (MINEUR)

Lis `.claude/skills/000-dev-rules/SKILL.md`.
Lis `apps/web/src/app/` pour comprendre le routing Next.js.

### Bug UI-404 : /onboarding → 404

**Cause** : L'onboarding utilise des routes Next.js `/step-1`, `/step-2`, etc. sous un route group `(onboarding)`. Il n'y a pas de page `/onboarding` qui redirige vers `/step-1`.

**Fix** :
1. Creer `apps/web/src/app/onboarding/page.tsx` (ou dans le route group)
2. Contenu : `redirect('/step-1')` ou `redirect('/onboarding/step-1')` selon la structure
3. Ou ajouter un `layout.tsx` dans le group qui redirige automatiquement

### Bug SETTINGS-ROUTING : Conflit de routage Settings

**Cause** : Pages Settings reparties entre 2 emplacements :
- `(dashboard)/settings/` : profile, accounting, connectors, general
- `settings/` (racine) : payments, ppf

**Fix** :
1. Deplacer TOUTES les pages settings sous `(dashboard)/settings/`
2. Supprimer le dossier `settings/` a la racine
3. Mettre a jour le sidebar si necessaire (liens coherents)
4. Verifier que la navigation fonctionne depuis le sidebar

**Tests B3** :
1. /onboarding → redirige vers la premiere etape (pas 404)
2. /settings/payments accessible depuis le dashboard
3. /settings/ppf accessible depuis le dashboard
4. Tous les liens du sidebar pointent vers des pages existantes
5. 0 regression

Commit : `fix(web): B3 fix onboarding redirect and settings routing consolidation`

---

## Regles communes

- Stack : Fastify + TypeScript strict + Zod + in-memory storage
- Result Pattern obligatoire
- Montants en centimes (JAMAIS de float)
- Soft delete, multi-tenant (tenant_id)
- Tests : `pnpm test` — 0 regression
- **B0 DOIT etre fait en premier** (les autres bugs dependent de la persistence)
