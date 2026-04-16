# Progression Bug Fixes — zenAdmin

**Derniere mise a jour** : 2026-04-16
**Dernier prompt complete** : B3
**Prochain prompt a executer** : (tous completes)

## Checklist des Prompts

| # | Prompt | Description | Bugs couverts | Statut |
|---|--------|-------------|---------------|--------|
| B0 | Persistence + TVA | Corriger tenant_id devis/factures + calcul TVA | PERSIST-001-008, CALC-002, CALC-003 | `COMPLETED` |
| B1 | Routes + RBAC | Enregistrer routes manquantes + fixer permissions | ROUTE-404, RBAC-001, BANK-001 | `COMPLETED` |
| B2 | Workflows + Validation | Fixer envoi devis + creation DUERP + SIRET fallback | WF-011, DUERP-020, SIRET-001 | `COMPLETED` |
| B3 | Navigation + UI | Onboarding redirect + settings routing | UI-404, SETTINGS-ROUTING | `COMPLETED` |

## Statistiques
- **Total prompts** : 4
- **Completes** : 4
- **En cours** : 0
- **Restants** : 0

## Journal d'execution

| Date | Prompt | Statut | Tests | Commit | Notes |
|------|--------|--------|-------|--------|-------|
| 2026-04-16 | B0 | COMPLETED | 814/814 | fix(ventes): B0 fix tenant_id persistence and TVA calculation | Invoice in-memory repo implemented, TVA switched from basis points to percentage |
| 2026-04-16 | B1 | COMPLETED | 819/819 | fix(api): B1 register missing routes and fix RBAC owner permissions | Client/product/settings routes created, dashboard RBAC added, POST bank/accounts added |
| 2026-04-16 | B2 | COMPLETED | 825/825 | fix(api): B2 fix quote send workflow, DUERP validation and SIRET cascade | Quote send accepts empty body, evaluator_name optional, SIRET timeout+clear error |
| 2026-04-16 | B3 | COMPLETED | 825/825 | fix(web): B3 fix onboarding redirect and settings routing consolidation | /onboarding redirects to /step-1, all settings pages under (dashboard)/settings |
