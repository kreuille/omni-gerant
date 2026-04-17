# NF525 Kiwiz — Suivi de progression

## Statut global : COMPLETED

| Prompt | Description | Statut | Tests | Date | Commit |
|--------|-------------|--------|-------|------|--------|
| K0 | Client Kiwiz + Config + Mapper | COMPLETED | 25 | 2026-04-17 | 85ec83b |
| K1 | Certification factures a la validation | COMPLETED | 10 | 2026-04-17 | 1ee6989 |
| K2 | Certification avoirs (credit memos) | COMPLETED | 6 | 2026-04-17 | 1ee6989 |
| K3 | Job retry batch automatique | COMPLETED | 8 | 2026-04-17 | f6220fa |
| K4 | Verification + Dashboard + Download PDF | COMPLETED | 8 | 2026-04-17 | f6220fa |
| K5 | Mode revendeur + souscriptions tenant | COMPLETED | 8 | 2026-04-17 | f6220fa |

## Journal

| Date | Prompt | Tests | Notes |
|------|--------|-------|-------|
| 2026-04-17 | K0 | 25 | Client HTTP, config, mapper, conversion centimes→float, 25 tests |
| 2026-04-17 | K1+K2 | 16 | Certification service (invoices + credit memos), routes, non-bloquant |
| 2026-04-17 | K3+K4+K5 | 24 | Retry job, dashboard, download PDF, souscriptions revendeur |

## Totaux

- **Tests NF525** : 65 (minimum requis : 55)
- **Tests totaux API** : 1011
- **Fichiers crees** : 7 (config, client, mapper, service, routes, job, subscriptions)
- **Fichiers tests** : 2

## Notes

- API Kiwiz : https://api.kiwiz.io (Swagger : https://api.kiwiz.io/doc/user)
- Conversion centimes → float 4 decimales pour tous les montants
- Certification non-bloquante : si Kiwiz down, la facture est quand meme validee
- Retry batch toutes les 15 min (max 50 documents par batch)
