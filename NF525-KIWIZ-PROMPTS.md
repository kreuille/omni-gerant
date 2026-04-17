# Prompts Claude Code — Integration NF525 via Kiwiz API

> Ce fichier contient 6 prompts (K0-K5) pour integrer la certification NF525
> via l'API tierce Kiwiz (api.kiwiz.io) dans zenAdmin.
> Pre-requis : Module facturation fonctionnel + deploiement API operationnel.

---

## K0 — Client Kiwiz + Configuration

**Commit** : `feat(nf525): add Kiwiz API client and configuration`

### Contexte

Kiwiz (kiwiz.io) est un service certifie NF525 qui gere la chaine de hash,
les clotures periodiques et l'archivage immutable via notarisation blockchain.
Au lieu d'implementer la certification NF525 en interne, zenAdmin delegue
cette responsabilite a Kiwiz via leur API REST.

**API Swagger** : https://api.kiwiz.io/doc/user (v1.3.11)

### Fichiers a creer

#### 1. `apps/api/src/modules/nf525/kiwiz-config.ts`

```typescript
// BUSINESS RULE [CDC-6]: Configuration Kiwiz NF525
export interface KiwizConfig {
  apiUrl: string;            // https://api.kiwiz.io (prod) ou sandbox
  username: string;          // Identifiant Kiwiz
  password: string;          // Mot de passe Kiwiz
  subscriptionId?: string;   // ID souscription (mode revendeur)
  testMode: boolean;         // true en dev/staging, false en prod
}

export function loadKiwizConfig(): KiwizConfig {
  const apiUrl = process.env.KIWIZ_API_URL || 'https://api.kiwiz.io';
  const username = process.env.KIWIZ_USERNAME;
  const password = process.env.KIWIZ_PASSWORD;
  const subscriptionId = process.env.KIWIZ_SUBSCRIPTION_ID;
  const testMode = process.env.NODE_ENV !== 'production';

  if (!username || !password) {
    throw new Error('KIWIZ_USERNAME and KIWIZ_PASSWORD are required');
  }

  return { apiUrl, username, password, subscriptionId, testMode };
}
```

#### 2. `apps/api/src/modules/nf525/kiwiz-client.ts`

Cree un client HTTP complet pour l'API Kiwiz :

```typescript
import type { Result } from '@omni-gerant/shared';
import { ok, err } from '@omni-gerant/shared';
import type { AppError } from '@omni-gerant/shared';

// BUSINESS RULE [CDC-6]: Client API Kiwiz pour certification NF525

export interface KiwizTokenResponse {
  token: string;
}

export interface KiwizInvoiceSaveResponse {
  file_hash: string;
  block_hash: string;
}

export interface KiwizInvoiceData {
  increment_id: string;          // Numero facture (FAC-2026-00001)
  date: string;                  // UTC "YYYY-MM-DD HH:mm:ss"
  currency_code: string;         // "EUR"
  email: string;                 // Email client
  billing_address: KiwizAddress;
  shipping_address?: KiwizAddress;
  payment_method: string;        // "virement", "carte", "prelevement"
  items: KiwizItem[];
  grand_total_excl_tax: number;  // float 4 decimales (ex: 150.0000)
  grand_total_incl_tax?: number; // float 4 decimales
  grand_total_tax_amount: KiwizTax[];
  discount_amount?: number;
  shipping_amount?: number;
}

export interface KiwizAddress {
  firstname?: string;
  lastname: string;
  company?: string;
  street: string;
  postcode: string;
  city: string;
  country_code?: string;         // "FR"
}

export interface KiwizItem {
  sku: string;                   // Reference produit
  product_name: string;
  qty: number;
  row_total_excl_tax: number;    // float 4 decimales
  row_total_incl_tax?: number;
  row_total_tax_amount: KiwizTax[];
  discount_amount?: number;
}

export interface KiwizTax {
  tax_name: string;              // "TVA 20%", "TVA 10%", etc.
  tax_value: number;             // Montant en float 4 decimales
}

export interface KiwizQuotaInfo {
  used: number;
  limit: number;
}
```

**Implementation du client** :

Le client doit :

1. **Authentification** : `POST /token/generate` avec `{username, password, subscription_id?}` → stocker le token en memoire avec TTL (pas de persistence)

2. **Gestion du token** : auto-refresh si expir ou erreur 401. Retry 1 fois apres re-auth.

3. **saveInvoice(pdfBuffer, data)** :
   - `POST /invoice/save` en `multipart/form-data`
   - Champ `document` : le fichier PDF (Buffer)
   - Champ `data` : JSON stringifie du modele KiwizInvoiceData
   - Champ `test_mode` : "1" ou "0" selon config
   - Retourne `Result<KiwizInvoiceSaveResponse, AppError>`

4. **getInvoice(blockHash)** :
   - `GET /invoice/get?block_hash={blockHash}`
   - Retourne le PDF certifie (Buffer)

5. **saveCreditMemo(pdfBuffer, data)** :
   - `POST /creditmemo/save` — meme pattern que saveInvoice
   - Retourne `Result<KiwizInvoiceSaveResponse, AppError>`

6. **getCreditMemo(blockHash)** :
   - `GET /creditmemo/get?block_hash={blockHash}`

7. **getQuota()** :
   - `GET /quota/info`
   - Retourne `Result<KiwizQuotaInfo, AppError>`

**ATTENTION conversion centimes → float** :
zenAdmin stocke les montants en centimes (entiers). Kiwiz attend des floats a 4 decimales.
Cree un helper :
```typescript
// BUSINESS RULE [CDC-2.1]: Conversion centimes → float Kiwiz (4 decimales)
export function centsToKiwizFloat(cents: number): number {
  return Math.round(cents) / 100;
  // Note: toFixed(4) pour la serialisation JSON, mais le type reste number
}
```

Et dans le JSON.stringify custom, formater avec 4 decimales :
```typescript
function formatKiwizAmount(cents: number): string {
  return (cents / 100).toFixed(4);
}
```

Pour le multipart, utiliser `form-data` (npm) ou le FormData natif Node 18+.

#### 3. `apps/api/src/modules/nf525/kiwiz-mapper.ts`

Mapper qui convertit un Invoice zenAdmin en KiwizInvoiceData :

```typescript
// BUSINESS RULE [CDC-2.1]: Mapping facture zenAdmin → format Kiwiz NF525

export function mapInvoiceToKiwiz(
  invoice: Invoice,
  client: Client,
  company: TenantCompany
): KiwizInvoiceData {
  // - increment_id = invoice.number (FAC-2026-00001)
  // - date = invoice.created_at en UTC "YYYY-MM-DD HH:mm:ss"
  // - currency_code = "EUR"
  // - email = client.email
  // - billing_address = mapper depuis client.address
  // - payment_method = invoice.payment_method || "virement"
  // - items = invoice.lines.map(line => ({
  //     sku: line.product_reference || line.id,
  //     product_name: line.description,
  //     qty: line.quantity,
  //     row_total_excl_tax: centsToKiwizFloat(line.total_ht_cents),
  //     row_total_tax_amount: [{
  //       tax_name: `TVA ${line.tva_rate / 100}%`,
  //       tax_value: centsToKiwizFloat(line.tva_cents)
  //     }]
  //   }))
  // - grand_total_excl_tax = centsToKiwizFloat(invoice.total_ht_cents)
  // - grand_total_incl_tax = centsToKiwizFloat(invoice.total_ttc_cents)
  // - grand_total_tax_amount = invoice.tva_breakdown.map(...)
}
```

Idem pour les avoirs : `mapCreditMemoToKiwiz(...)`.

#### 4. Tests

Cree `apps/api/src/modules/nf525/__tests__/kiwiz-client.test.ts` :

- Test `centsToKiwizFloat` : 1500 → 15.0000, 0 → 0.0000, 199 → 1.9900, 1 → 0.0100
- Test `formatKiwizAmount` : 1500 → "15.0000", 0 → "0.0000"
- Test `mapInvoiceToKiwiz` : verifier tous les champs avec une facture fixture
- Test `mapCreditMemoToKiwiz` : idem avec un avoir
- Test client `authenticate` : mocker fetch, verifier token stocke
- Test client `saveInvoice` : mocker fetch multipart, verifier FormData contient document + data + test_mode
- Test client `getInvoice` : mocker fetch, verifier retour Buffer
- Test client `getQuota` : mocker fetch, verifier {used, limit}
- Test retry sur 401 : mocker 401 puis 200 apres re-auth
- Test erreur Kiwiz : mocker 500, verifier Result err

**Minimum 15 tests pour ce prompt.**

### Variables d'environnement a ajouter

Dans `render.yaml` (section envVars du service API) :
```yaml
- key: KIWIZ_API_URL
  value: https://api.kiwiz.io
- key: KIWIZ_USERNAME
  sync: false  # A configurer manuellement dans Render
- key: KIWIZ_PASSWORD
  sync: false
- key: KIWIZ_SUBSCRIPTION_ID
  sync: false
```

Dans `.env.example` :
```
KIWIZ_API_URL=https://api.kiwiz.io
KIWIZ_USERNAME=
KIWIZ_PASSWORD=
KIWIZ_SUBSCRIPTION_ID=
```

---

## K1 — Integration dans le flux d'emission facture

**Commit** : `feat(nf525): certify emitted invoices via Kiwiz API`

### Contexte

Quand une facture est validee (statut `validated`), zenAdmin doit :
1. Generer le PDF Factur-X (deja fait)
2. Envoyer le PDF + metadata a Kiwiz pour certification NF525
3. Stocker le `file_hash` et `block_hash` retournes par Kiwiz
4. Marquer la facture comme certifiee

### Fichiers a modifier

#### 1. Schema Prisma (ou modele en memoire)

Ajouter au modele `Invoice` :
```typescript
// BUSINESS RULE [CDC-6]: Certification NF525 via Kiwiz
nf525_file_hash     String?    // Hash du fichier PDF retourne par Kiwiz
nf525_block_hash    String?    // Hash de bloc (chaine) retourne par Kiwiz
nf525_certified_at  DateTime?  // Date de certification
nf525_test_mode     Boolean    @default(false) // true si certifie en mode test
```

#### 2. `apps/api/src/modules/invoice/invoice.service.ts`

Modifier le flux de validation de facture :

```typescript
// BUSINESS RULE [CDC-6]: Certification NF525 apres validation facture

async function validateInvoice(invoiceId: string, tenantId: string): Promise<Result<Invoice, AppError>> {
  // 1. Recuperer la facture
  // 2. Verifier qu'elle est en draft
  // 3. Generer le PDF Factur-X (existant)
  // 4. >>> NOUVEAU : Certifier via Kiwiz <<<
  const pdfBuffer = await generateInvoicePdf(invoice);
  const kiwizData = mapInvoiceToKiwiz(invoice, client, company);
  const certResult = await kiwizClient.saveInvoice(pdfBuffer, kiwizData);

  if (!certResult.ok) {
    // Log l'erreur mais ne bloque PAS la validation
    // La certification peut etre retentee plus tard
    logger.error('Kiwiz certification failed', {
      invoiceId,
      error: certResult.error,
      tenantId,
    });
  } else {
    // Stocker les hash de certification
    invoice.nf525_file_hash = certResult.value.file_hash;
    invoice.nf525_block_hash = certResult.value.block_hash;
    invoice.nf525_certified_at = new Date();
    invoice.nf525_test_mode = kiwizConfig.testMode;
  }

  // 5. Mettre a jour le statut → validated
  // 6. Audit trail
  // 7. Retourner la facture mise a jour
}
```

**IMPORTANT** : La certification Kiwiz ne doit PAS bloquer la validation de facture.
Si Kiwiz est indisponible, la facture est quand meme validee et un job de retry
la certifiera plus tard (voir K3).

#### 3. Nouvel endpoint : retry certification

Cree un endpoint pour re-tenter la certification des factures non certifiees :

```
POST /api/invoices/:id/certify    # Re-tenter la certification NF525
GET  /api/invoices/:id/nf525      # Recuperer les infos NF525 d'une facture
```

Le endpoint `certify` :
- Verifie que la facture est `validated` et que `nf525_block_hash` est null
- Re-tente l'envoi a Kiwiz
- Met a jour les champs NF525

Le endpoint `nf525` :
- Retourne `{ file_hash, block_hash, certified_at, test_mode, certified: boolean }`

#### 4. Tests

- Test validation facture avec Kiwiz OK → hash stockes
- Test validation facture avec Kiwiz KO → facture quand meme validee, hash null
- Test retry certification → facture non certifiee → appel Kiwiz → hash stockes
- Test retry sur facture deja certifiee → erreur "already certified"
- Test endpoint GET nf525 → retourne les infos
- Test que la facture validee est bien immuable (pas de modification possible apres validation)

**Minimum 10 tests pour ce prompt.**

---

## K2 — Integration dans le flux d'emission avoir (credit memo)

**Commit** : `feat(nf525): certify credit memos via Kiwiz API`

### Contexte

Identique a K1 mais pour les avoirs. Quand un avoir est emis, il doit aussi
etre certifie via Kiwiz (endpoint `/creditmemo/save`).

### Fichiers a modifier

#### 1. Schema — Ajouter au modele CreditMemo (ou Invoice type=381)

Memes champs NF525 que K1 :
```
nf525_file_hash, nf525_block_hash, nf525_certified_at, nf525_test_mode
```

Si les avoirs sont stockes dans la meme table Invoice (avec type_code 381),
les champs existent deja. Sinon, les ajouter.

#### 2. Service avoir

Modifier `createCreditMemo` ou l'equivalent :
- Apres generation PDF, appeler `kiwizClient.saveCreditMemo(pdfBuffer, data)`
- Meme logique non-bloquante que K1 (log + retry si echec)

#### 3. Tests

- Test emission avoir avec certification Kiwiz
- Test emission avoir avec Kiwiz KO → avoir quand meme emis
- Test mapping avoir → KiwizInvoiceData (type_code 381)
- Test retry certification avoir

**Minimum 6 tests pour ce prompt.**

---

## K3 — Job de certification automatique (retry + batch)

**Commit** : `feat(nf525): add automatic certification retry job`

### Contexte

Les factures/avoirs non certifies (Kiwiz indisponible au moment de la validation)
doivent etre re-certifies automatiquement.

### Fichiers a creer

#### 1. `apps/api/src/modules/nf525/kiwiz-certification-job.ts`

```typescript
// BUSINESS RULE [CDC-6]: Job de certification NF525 automatique

export async function runCertificationRetryJob(
  invoiceRepo: InvoiceRepository,
  kiwizClient: KiwizClient,
  logger: Logger
): Promise<{ certified: number; failed: number; total: number }> {
  // 1. Recuperer toutes les factures validated sans nf525_block_hash
  //    (limite: 50 par batch pour ne pas saturer l'API)
  // 2. Pour chaque facture :
  //    a. Generer le PDF si pas en cache
  //    b. Mapper vers KiwizInvoiceData
  //    c. Appeler kiwizClient.saveInvoice()
  //    d. Si OK : mettre a jour les hash
  //    e. Si KO : logger, incrementer failed
  // 3. Meme chose pour les avoirs non certifies
  // 4. Retourner le bilan { certified, failed, total }
}
```

#### 2. Enregistrement du cron

Dans le fichier de configuration des cron jobs existant, ajouter :

```typescript
// Toutes les 15 minutes, re-tenter la certification des documents non certifies
schedule('*/15 * * * *', runCertificationRetryJob);
```

#### 3. Endpoint admin pour lancer manuellement

```
POST /api/admin/nf525/retry-all   # Lance le batch manuellement (admin only)
GET  /api/admin/nf525/status       # Nombre de docs certifies/non certifies
```

#### 4. Tests

- Test batch avec 0 documents non certifies → {certified: 0, failed: 0, total: 0}
- Test batch avec 3 factures non certifiees → Kiwiz OK → 3 certifiees
- Test batch avec 2 factures dont 1 Kiwiz KO → {certified: 1, failed: 1, total: 2}
- Test limite batch a 50
- Test endpoint admin/nf525/status

**Minimum 8 tests pour ce prompt.**

---

## K4 — Endpoint verification + recuperation PDF certifie

**Commit** : `feat(nf525): add NF525 verification and certified PDF download`

### Contexte

Permettre aux utilisateurs de :
1. Verifier qu'une facture est bien certifiee NF525
2. Telecharger le PDF certifie depuis Kiwiz (qui peut contenir des metadonnees supplementaires)
3. Voir le statut de certification sur le dashboard

### Endpoints a creer

```
GET /api/invoices/:id/nf525/verify     # Verifie la certification
GET /api/invoices/:id/nf525/download   # Telecharge le PDF certifie depuis Kiwiz
GET /api/nf525/dashboard               # Dashboard de conformite NF525
```

#### 1. Endpoint verify

Retourne :
```json
{
  "certified": true,
  "file_hash": "abc123...",
  "block_hash": "def456...",
  "certified_at": "2026-04-17T10:00:00Z",
  "test_mode": false,
  "invoice_number": "FAC-2026-00001"
}
```

#### 2. Endpoint download

- Appelle `kiwizClient.getInvoice(blockHash)`
- Retourne le PDF avec headers `Content-Type: application/pdf` et `Content-Disposition: attachment`

#### 3. Dashboard NF525

Retourne un resume de conformite :
```json
{
  "total_invoices": 150,
  "certified_invoices": 148,
  "pending_certification": 2,
  "certification_rate": 98.67,
  "last_certification": "2026-04-17T10:00:00Z",
  "kiwiz_quota": { "used": 148, "limit": 1000 },
  "test_mode": false
}
```

#### 4. Frontend — Badge de certification

Dans le composant detail facture (`apps/web/src/app/(dashboard)/invoices/[id]/page.tsx`), ajouter un badge :
- Si `nf525_certified_at` existe : badge vert "Certifie NF525" avec icone bouclier
- Si null et statut validated : badge orange "Certification en attente"
- Si draft : pas de badge
- Clic sur le badge → affiche file_hash et block_hash + bouton "Telecharger PDF certifie"

#### 5. Tests

- Test verify facture certifiee → retourne les infos
- Test verify facture non certifiee → retourne certified: false
- Test download PDF certifie → retourne le buffer
- Test download facture non certifiee → erreur 404
- Test dashboard → calcule les stats correctement
- Test badge frontend (optionnel, si tests frontend existants)

**Minimum 8 tests pour ce prompt.**

---

## K5 — Mode revendeur + gestion souscriptions tenant

**Commit** : `feat(nf525): add Kiwiz reseller subscription management`

### Contexte

Kiwiz offre un mode revendeur (reseller) : zenAdmin peut creer des sous-comptes
Kiwiz pour chaque tenant (entreprise cliente). Cela permet :
- Facturation par tenant (chacun a son propre quota)
- Isolation des donnees certifiees par entreprise
- Gestion automatique du cycle de vie (creation a l'onboarding, suspension, reactivation)

### Fichiers a creer

#### 1. `apps/api/src/modules/nf525/kiwiz-subscription.service.ts`

```typescript
// BUSINESS RULE [CDC-6]: Gestion souscriptions Kiwiz par tenant

export interface KiwizSubscriptionService {
  // Creer une souscription Kiwiz lors de l'onboarding d'un nouveau tenant
  createSubscription(tenant: Tenant): Promise<Result<{subscriptionId: string}, AppError>>;

  // Recuperer l'info de souscription
  getSubscription(tenantId: string): Promise<Result<KiwizSubscription, AppError>>;

  // Annuler (quand un tenant desactive son compte)
  cancelSubscription(tenantId: string): Promise<Result<void, AppError>>;

  // Reactiver
  reactivateSubscription(tenantId: string): Promise<Result<void, AppError>>;
}
```

**Mapping Kiwiz API** :
- `POST /subscription/add` avec `{plan_id, company_name, company_email, legal_representative_name, closing_fiscal_date}`
- `GET /subscription/get` → infos souscription
- `POST /subscription/cancel` → annuler
- `POST /subscription/reactivate` → reactiver
- `GET /plan/get` → lister les plans disponibles
- `GET /quota/info` → quotas

#### 2. Schema Prisma — Ajouter au modele Tenant

```
kiwiz_subscription_id    String?    // ID souscription Kiwiz
kiwiz_plan_id            String?    // Plan Kiwiz
kiwiz_created_at         DateTime?  // Date creation souscription
```

#### 3. Integration onboarding

Dans le flux d'onboarding (quand un nouveau tenant est cree) :
- Apres creation du tenant dans la DB
- Appeler `kiwizSubscriptionService.createSubscription(tenant)`
- Stocker le `subscription_id` retourne
- Si echec : logger, ne pas bloquer l'onboarding (retry plus tard)

#### 4. Page settings PPF/NF525

Dans `apps/web/src/app/(dashboard)/settings/ppf/page.tsx` (ou creer un onglet NF525) :
- Afficher le statut de souscription Kiwiz
- Afficher les quotas (used/limit)
- Bouton pour forcer la certification des documents en attente
- Historique des certifications recentes

#### 5. Tests

- Test creation souscription → appel Kiwiz OK → subscription_id stocke
- Test creation souscription → Kiwiz KO → pas de blocage onboarding
- Test annulation souscription
- Test reactivation souscription
- Test quota info
- Test integration onboarding (flow complet)

**Minimum 8 tests pour ce prompt.**

---

## Resume des dependances

```
K0 (Client + Config)
 ├── K1 (Certification factures) — depend de K0
 ├── K2 (Certification avoirs) — depend de K0
 ├── K3 (Job retry batch) — depend de K1 + K2
 ├── K4 (Verification + Dashboard) — depend de K1
 └── K5 (Souscriptions revendeur) — depend de K0
```

**Ordre recommande** : K0 → K1 → K2 → K3 → K4 → K5

**Total minimum de tests** : 15 + 10 + 6 + 8 + 8 + 8 = **55 tests**
