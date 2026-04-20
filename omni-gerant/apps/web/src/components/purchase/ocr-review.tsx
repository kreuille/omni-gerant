'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// BUSINESS RULE [CDC-2.2]: Review/correction donnees extraites par OCR

interface OcrReviewProps {
  extraction: {
    document_type: string;
    fields: {
      supplier_name: string | null;
      invoice_number: string | null;
      invoice_date: string | null;
      due_date: string | null;
      total_ht_cents: number | null;
      total_tva_cents: number | null;
      total_ttc_cents: number | null;
    };
    lines: Array<{
      label: string;
      quantity: number;
      unit_price_cents: number;
      tva_rate: number;
      total_ht_cents: number;
      confidence: number;
    }>;
    overall_confidence: number;
    warnings: string[];
  };
  onConfirm?: (data: ConfirmedData) => void;
  onCancel?: () => void;
}

interface ConfirmedData {
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  lines: Array<{
    label: string;
    quantity: number;
    unit_price_cents: number;
    tva_rate: number;
  }>;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.8) return <Badge variant="success">Fiable</Badge>;
  if (confidence >= 0.5) return <Badge variant="warning">A verifier</Badge>;
  return <Badge variant="error">Faible</Badge>;
}

export function OcrReview({ extraction, onConfirm, onCancel }: OcrReviewProps) {
  const { fields, lines, overall_confidence, warnings, document_type } = extraction;

  const [supplierName, setSupplierName] = useState(fields.supplier_name ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(fields.invoice_number ?? '');
  const [invoiceDate, setInvoiceDate] = useState(fields.invoice_date ?? '');
  const [dueDate, setDueDate] = useState(fields.due_date ?? '');

  return (
    <div className="space-y-6">
      {/* Confidence overview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Type de document</p>
              <p className="font-medium capitalize">{document_type}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Confiance globale</p>
              <div className="flex items-center gap-2">
                <span className="font-medium">{Math.round(overall_confidence * 100)}%</span>
                {confidenceBadge(overall_confidence)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm font-medium text-yellow-800 mb-1">Avertissements</p>
          <ul className="text-sm text-yellow-700 list-disc pl-4">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Editable fields */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Donnees extraites</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fournisseur</label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Numero facture</label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date facture</label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date echeance</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Montants detectes</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total HT</span>
              <span className="font-medium">
                {fields.total_ht_cents != null ? formatCents(fields.total_ht_cents) + ' EUR' : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">TVA</span>
              <span className="font-medium">
                {fields.total_tva_cents != null ? formatCents(fields.total_tva_cents) + ' EUR' : '-'}
              </span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total TTC</span>
              <span>
                {fields.total_ttc_cents != null ? formatCents(fields.total_ttc_cents) + ' EUR' : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      {lines.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Lignes detectees</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Designation</th>
                  <th className="py-2 text-right">Qté</th>
                  <th className="py-2 text-right">P.U. HT</th>
                  <th className="py-2 text-right">Total HT</th>
                  <th className="py-2 text-right">Confiance</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 text-right">{line.quantity}</td>
                    <td className="py-2 text-right">{formatCents(line.unit_price_cents)}</td>
                    <td className="py-2 text-right font-medium">{formatCents(line.total_ht_cents)}</td>
                    <td className="py-2 text-right">{Math.round(line.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={() =>
            onConfirm?.({
              supplier_name: supplierName,
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate,
              due_date: dueDate,
              lines: lines.map((l) => ({
                label: l.label,
                quantity: l.quantity,
                unit_price_cents: l.unit_price_cents,
                tva_rate: l.tva_rate,
              })),
            })
          }
        >
          Valider et creer la facture
        </Button>
      </div>
    </div>
  );
}
