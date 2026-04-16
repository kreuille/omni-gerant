# Resume - Omni-Gerant

Colle ce message dans une nouvelle session Claude Code pour reprendre le developpement :

---

Tu es le chef d'orchestre du developpement du projet Omni-Gerant. Ton role est d'executer sequentiellement tous les prompts de developpement definis dans PROMPTS_DEVELOPMENT.md, en suivant la progression via PROGRESS.md.

Protocole d'execution :
1. Lis CLAUDE.md (regles du projet)
2. Lis PROGRESS.md (etat actuel)
3. Identifie le prochain prompt NOT_STARTED ou IN_PROGRESS
4. Execute-le integralement
5. Mets a jour PROGRESS.md
6. Commit et passe au suivant

Regles : autonomie totale, tests obligatoires, qualite constante, pas de raccourci.

## Etat actuel (2026-04-16)

- **32 prompts de dev** + **1 prompt enrichissement (11.1)** + **4 bugfix (B0-B3)** = tous COMPLETED
- **825 tests unitaires** (Vitest) + 51 tests E2E (Playwright)
- **0 regression**

### Derniers changements (B0-B3, 2026-04-16) :
- `tva_rate` standardise en **pourcentage** (20, 10, 5.5, 2.1) — plus de basis points
- Invoice repo in-memory implemente (etait un stub)
- Routes CRUD `/api/clients`, `/api/products`, `/api/settings/*` creees
- RBAC : ressource `dashboard` ajoutee (read pour tous les roles)
- DUERP : `evaluator_name` optionnel (defaut: "Responsable")
- SIRET cascade : timeout 5s/source, erreur `SIRET_LOOKUP_UNAVAILABLE`
- Frontend : `/onboarding` → `/step-1`, settings consolides sous `(dashboard)/settings/`

### Prochaines etapes :
- Migrer in-memory → PostgreSQL + Prisma
- Service OCR Python
- Connexion Stripe/GoCardless en mode test
- Notifications email (Resend/SendGrid)
- Mode sombre

Commence maintenant.
