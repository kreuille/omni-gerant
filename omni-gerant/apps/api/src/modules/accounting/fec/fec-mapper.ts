// BUSINESS RULE [CDC-3.2]: Mapping donnees → ecritures comptables
// Plan comptable simplifie pour TPE

export interface FecEntry {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;    // YYYYMMDD
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;       // YYYYMMDD
  EcritureLib: string;
  Debit: string;           // format: 1234.56
  Credit: string;          // format: 1234.56
  EcritureLet: string;
  DateLet: string;
  ValidDate: string;       // YYYYMMDD
  Montantdevise: string;
  Idevise: string;
}

export interface SaleInvoice {
  number: string;
  date: Date;
  client_name: string;
  client_code: string;
  amount_ht_cents: number;
  tva_cents: number;
  amount_ttc_cents: number;
}

export interface PurchaseInvoice {
  number: string;
  date: Date;
  supplier_name: string;
  supplier_code: string;
  amount_ht_cents: number;
  tva_cents: number;
  amount_ttc_cents: number;
}

export interface PaymentRecord {
  number: string;
  date: Date;
  amount_cents: number;
  entity_name: string;
  entity_code: string;
  type: 'client' | 'supplier';
  invoice_ref: string;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function centsToFec(cents: number): string {
  return (cents / 100).toFixed(2);
}

let entryCounter = 0;

function nextEcritureNum(): string {
  entryCounter++;
  return `EC${String(entryCounter).padStart(6, '0')}`;
}

export function resetEntryCounter(): void {
  entryCounter = 0;
}

// BUSINESS RULE [CDC-3.2]: Factures emises → Journal VE (Ventes)
// Debit 411xxx (Client) du TTC
// Credit 7xxxxx (Produits) du HT
// Credit 44571x (TVA collectee) de la TVA
export function mapSaleInvoice(invoice: SaleInvoice): FecEntry[] {
  const num = nextEcritureNum();
  const date = formatDate(invoice.date);
  const clientAccount = `411${invoice.client_code.padStart(3, '0')}`;

  return [
    {
      JournalCode: 'VE',
      JournalLib: 'Ventes',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: clientAccount,
      CompteLib: `Client ${invoice.client_name}`,
      CompAuxNum: invoice.client_code,
      CompAuxLib: invoice.client_name,
      PieceRef: invoice.number,
      PieceDate: date,
      EcritureLib: `Facture ${invoice.number}`,
      Debit: centsToFec(invoice.amount_ttc_cents),
      Credit: '0.00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
    {
      JournalCode: 'VE',
      JournalLib: 'Ventes',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: '706000',
      CompteLib: 'Prestations de services',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.number,
      PieceDate: date,
      EcritureLib: `Facture ${invoice.number}`,
      Debit: '0.00',
      Credit: centsToFec(invoice.amount_ht_cents),
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
    {
      JournalCode: 'VE',
      JournalLib: 'Ventes',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: '445710',
      CompteLib: 'TVA collectee',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.number,
      PieceDate: date,
      EcritureLib: `TVA Facture ${invoice.number}`,
      Debit: '0.00',
      Credit: centsToFec(invoice.tva_cents),
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
  ];
}

// BUSINESS RULE [CDC-3.2]: Factures fournisseurs → Journal AC (Achats)
// Debit 6xxxxx (Charges) du HT
// Debit 44566x (TVA deductible) de la TVA
// Credit 401xxx (Fournisseur) du TTC
export function mapPurchaseInvoice(invoice: PurchaseInvoice): FecEntry[] {
  const num = nextEcritureNum();
  const date = formatDate(invoice.date);
  const supplierAccount = `401${invoice.supplier_code.padStart(3, '0')}`;

  return [
    {
      JournalCode: 'AC',
      JournalLib: 'Achats',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: '606000',
      CompteLib: 'Achats non stockes',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.number,
      PieceDate: date,
      EcritureLib: `Facture ${invoice.number}`,
      Debit: centsToFec(invoice.amount_ht_cents),
      Credit: '0.00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
    {
      JournalCode: 'AC',
      JournalLib: 'Achats',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: '445660',
      CompteLib: 'TVA deductible sur biens et services',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.number,
      PieceDate: date,
      EcritureLib: `TVA Facture ${invoice.number}`,
      Debit: centsToFec(invoice.tva_cents),
      Credit: '0.00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
    {
      JournalCode: 'AC',
      JournalLib: 'Achats',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: supplierAccount,
      CompteLib: `Fournisseur ${invoice.supplier_name}`,
      CompAuxNum: invoice.supplier_code,
      CompAuxLib: invoice.supplier_name,
      PieceRef: invoice.number,
      PieceDate: date,
      EcritureLib: `Facture ${invoice.number}`,
      Debit: '0.00',
      Credit: centsToFec(invoice.amount_ttc_cents),
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
  ];
}

// BUSINESS RULE [CDC-3.2]: Paiements → Journal BQ (Banque)
export function mapPayment(payment: PaymentRecord): FecEntry[] {
  const num = nextEcritureNum();
  const date = formatDate(payment.date);

  if (payment.type === 'client') {
    // Encaissement client : Debit 512 (banque), Credit 411 (client)
    const clientAccount = `411${payment.entity_code.padStart(3, '0')}`;
    return [
      {
        JournalCode: 'BQ',
        JournalLib: 'Banque',
        EcritureNum: num,
        EcritureDate: date,
        CompteNum: '512000',
        CompteLib: 'Banque',
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: payment.number,
        PieceDate: date,
        EcritureLib: `Encaissement ${payment.invoice_ref}`,
        Debit: centsToFec(payment.amount_cents),
        Credit: '0.00',
        EcritureLet: '',
        DateLet: '',
        ValidDate: date,
        Montantdevise: '',
        Idevise: 'EUR',
      },
      {
        JournalCode: 'BQ',
        JournalLib: 'Banque',
        EcritureNum: num,
        EcritureDate: date,
        CompteNum: clientAccount,
        CompteLib: `Client ${payment.entity_name}`,
        CompAuxNum: payment.entity_code,
        CompAuxLib: payment.entity_name,
        PieceRef: payment.number,
        PieceDate: date,
        EcritureLib: `Encaissement ${payment.invoice_ref}`,
        Debit: '0.00',
        Credit: centsToFec(payment.amount_cents),
        EcritureLet: '',
        DateLet: '',
        ValidDate: date,
        Montantdevise: '',
        Idevise: 'EUR',
      },
    ];
  }

  // Paiement fournisseur : Debit 401 (fournisseur), Credit 512 (banque)
  const supplierAccount = `401${payment.entity_code.padStart(3, '0')}`;
  return [
    {
      JournalCode: 'BQ',
      JournalLib: 'Banque',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: supplierAccount,
      CompteLib: `Fournisseur ${payment.entity_name}`,
      CompAuxNum: payment.entity_code,
      CompAuxLib: payment.entity_name,
      PieceRef: payment.number,
      PieceDate: date,
      EcritureLib: `Paiement ${payment.invoice_ref}`,
      Debit: centsToFec(payment.amount_cents),
      Credit: '0.00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
    {
      JournalCode: 'BQ',
      JournalLib: 'Banque',
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: '512000',
      CompteLib: 'Banque',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: payment.number,
      PieceDate: date,
      EcritureLib: `Paiement ${payment.invoice_ref}`,
      Debit: '0.00',
      Credit: centsToFec(payment.amount_cents),
      EcritureLet: '',
      DateLet: '',
      ValidDate: date,
      Montantdevise: '',
      Idevise: 'EUR',
    },
  ];
}
