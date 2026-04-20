# QA 2026-04-20 — 2 bugs restants (planifies)

Statut au 2026-04-20 : **55/57 fermes (96 %)**. Ces 2 bugs sont intentionnellement
reportes car ils demandent un chantier dedie (pas un fix rapide).

---

## P1-06 — Tokens en localStorage (XSS-exploitable)

**Source** : `zenadmin-test-report/RAPPORT-BUGS.md#p1-06`

### Diagnostic actuel

- `apps/web/src/lib/api-client.ts` lit/ecrit `access_token` et `refresh_token`
  dans `localStorage`.
- Un cookie `auth_token` existe aussi mais n'est pas `HttpOnly` (lisible par JS).
- Le middleware `apps/web/src/middleware.ts` lit le cookie OU `Authorization`
  header. Les 2 modes cohabitent.
- Un XSS ailleurs dans l'app (cf P1-09, maintenant fixe cote serveur)
  permettrait le vol du refresh_token et donc une session longue.

### Pourquoi c'est reporte

Migration tokens en cookies `HttpOnly; Secure; SameSite=Strict` =
**changement de contrat d'API** :

- Cote Fastify : tout `/api/*` doit lire le cookie ET envoyer `Set-Cookie` a
  la reponse login/refresh/2fa. Les CORS/CSRF doivent etre re-parametres
  (`credentials: 'include'` cote client, origin strict cote serveur).
- Cote Next : tous les `api.get/post` doivent passer `credentials: 'include'`
  au `fetch`. Le middleware doit lire le cookie uniquement (plus d'header).
- Il faut une **protection CSRF** : `SameSite=Strict` est insuffisant pour
  les requetes cross-origin Vercel -> Render. Solution : double-submit cookie
  ou custom header `X-CSRF-Token`.
- Les invitations, Stripe webhooks et les routes publiques
  (`/share/quote/:token`, `/sign/:id`, `/accept-invite/:token`) doivent
  continuer a fonctionner sans cookie.

### Plan de migration (1-2 jours)

1. **Serveur API** :
   - Ajouter `@fastify/cookie` (installe via pnpm).
   - `plugins/auth.ts` : fallback lecture `request.cookies.access_token` si
     l'header Authorization est absent.
   - `auth.service.ts login/refresh` : setter les 2 cookies
     `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=None; Path=/`
     (SameSite=None car cross-origin Vercel -> Render).
   - `POST /api/auth/logout` : `reply.clearCookie('access_token')`.
   - CORS `credentials: true` deja en place, mais il faut que
     `CORS_ORIGIN` pointe exactement sur `omni-gerant.vercel.app` (pas `*`).

2. **Protection CSRF** :
   - Cookie `csrf_token` (non-HttpOnly, SameSite=Lax). Lisible par JS.
   - Header `X-CSRF-Token` dans tous les POST/PUT/PATCH/DELETE.
   - Middleware API : comparer cookie vs header ; rejeter si mismatch.

3. **Client Next** :
   - Supprimer tous les `localStorage.setItem/getItem('access_token'|'refresh_token')`.
   - `fetch('/api/...', { credentials: 'include', headers: { 'X-CSRF-Token': ... } })`.
   - Au login, lire le cookie `csrf_token` une fois et le garder en memoire
     React (pas localStorage).

4. **Tests** :
   - Verifier que l'URL ne contient plus jamais le token.
   - Verifier qu'un XSS injecte n'expose plus le refresh_token.
   - Verifier que Stripe Checkout + OAuth Google redirection fonctionnent
     toujours (flows cross-origin).

5. **Rollout** :
   - Deployer en mode *dual* pendant 1 release : accepter header ET cookie.
   - Logger la proportion de requetes en header vs cookie.
   - Une fois < 1 % en header, retirer le support header.

### Pre-requis

- Confirmer que `omni-gerant.vercel.app` et `omni-gerant-api.onrender.com` sont
  sur des domaines distincts (cross-site) -> `SameSite=None` obligatoire.
- Si on veut `SameSite=Strict`, il faut mettre l'API derriere un domaine
  `api.omni-gerant.vercel.app` (CNAME Vercel -> Render).

---

## P2-03 — Warning profil incomplet non actionnable

**Source** : `zenadmin-test-report/RAPPORT-BUGS.md#p2-03`

### Diagnostic actuel

- `/quotes/new` affiche "Votre profil entreprise est incomplet" avec un lien
  vers `/settings/profile`. Message binaire (affiche ou pas).
- Pas d'indicateur global de progression (% complete).
- L'EmptyState dashboard (ajoute dans PR #73) montre 3 etapes mais pas
  le degre de completion du profil (SIRET, NAF, adresse, TVA, IBAN...).

### Pourquoi c'est reporte

Bug UX mineur qui n'empeche pas la commercialisation. Il faut :

- Cote API : exposer `GET /api/tenants/me/completeness` retournant un score
  0-100 + liste des champs manquants.
- Cote UI : composant `ProfileCompletenessBadge` reutilisable dans la sidebar,
  le header, le dashboard et les pages devis/facture.
- Design : progress bar + tooltip detaille des champs manquants.

### Plan (4-6 heures)

1. **API** :
   ```typescript
   GET /api/tenants/me/completeness
   // Returns :
   {
     score: 75,
     required: ['siret', 'naf_code', 'address', 'email', 'phone'],
     optional: ['iban', 'rib', 'logo', 'tva_number', 'legal_form'],
     missing: ['iban', 'logo'],
     complete: false
   }
   ```

2. **UI** :
   - `components/tenant/completeness-badge.tsx` : anneau de progression
     (SVG circle) + pourcentage au centre. Tooltip au survol liste les
     champs manquants avec lien vers `/settings/profile#<field>`.
   - Placer la badge en haut de :
     - sidebar (compact, juste le %)
     - dashboard (large, avec CTAs inline)
     - `/quotes/new` et `/invoices/new` (remplace le warning actuel)

3. **Tests** :
   - Unit sur le calcul du score (differents sets de champs).
   - E2E : nouveau compte -> 0 % -> wizard step-1 -> 20 % -> step-4 -> 80 %.

---

## Criteres de Go-live

Ces 2 bugs ne bloquent **pas** la commercialisation beta. Ils sont planifies
pour **v0.3.0 "Hardening UX"** :

- Semaine 1 : P1-06 (cookies HttpOnly + CSRF). PR dediee, test manuel full
  parcours, deploy canary avant rollout complet.
- Semaine 2 : P2-03 (completeness badge + API). PR dediee, couverture de
  tests >= 90 %.

Proprietaire : a designer. Tickets a creer dans le board.
