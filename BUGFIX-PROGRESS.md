# Progression Bug Fixes — zenAdmin

**Derniere mise a jour** : 2026-04-16
**Dernier prompt complete** : B0
**Prochain prompt a executer** : B1

## Checklist des Prompts

| # | Prompt | Description | Bugs couverts | Statut |
|---|--------|-------------|---------------|--------|
| B0 | Persistence + TVA | Corriger tenant_id devis/factures + calcul TVA | PERSIST-001-008, CALC-002, CALC-003 | `COMPLETED` |
| B1 | Routes + RBAC | Enregistrer routes manquantes + fixer permissions | ROUTE-404, RBAC-001, BANK-001 | `NOT_STARTED` |
| B2 | Workflows + Validation | Fixer envoi devis + creation DUERP + SIRET fallback | WF-011, DUERP-020, SIRET-001 | `NOT_STARTED` |
| B3 | Navigation + UI | Onboarding redirect + settings routing | UI-404, SETTINGS-ROUTING | `NOT_STARTED` |

## Statistiques
- **Total prompts** : 4
- **Completes** : 1
- **En cours** : 0
- **Restants** : 3

## Journal d'execution

| Date | Prompt | Statut | Tests | Commit | Notes |
|------|--------|--------|-------|--------|-------|
| 2026-04-16 | B0 | COMPLETED | 814/814 | fix(ventes): B0 fix tenant_id persistence and TVA calculation | Invoice in-memory repo implemented, TVA switched from basis points to percentage |
