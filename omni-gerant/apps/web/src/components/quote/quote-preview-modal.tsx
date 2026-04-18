'use client';

import type { QuoteLineData } from './quote-line-row';

// BUSINESS RULE [CDC-2.1]: Apercu devis avant enregistrement

interface CompanyPreview {
  name?: string | null;
  siret?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  tva_number?: string | null;
}

interface ClientPreview {
  name?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  siret?: string | null;
}

interface QuotePreviewModalProps {
  title: string;
  lines: QuoteLineData[];
  validityDays: number;
  notes: string;
  onClose: () => void;
  company?: CompanyPreview | null;
  client?: ClientPreview | null;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

function formatRate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 1) + '%';
}

export function QuotePreviewModal({ title, lines, validityDays, notes, onClose, company, client }: QuotePreviewModalProps) {
  const productLines = lines.filter((l) => l.type === 'line');
  const totalHt = productLines.reduce((sum, l) => sum + l.total_ht_cents, 0);

  // Group TVA
  const tvaMap = new Map<number, { base: number; tva: number }>();
  for (const line of productLines) {
    const existing = tvaMap.get(line.tva_rate) ?? { base: 0, tva: 0 };
    existing.base += line.total_ht_cents;
    existing.tva += Math.round((line.total_ht_cents * line.tva_rate) / 10000);
    tvaMap.set(line.tva_rate, existing);
  }
  const totalTva = Array.from(tvaMap.values()).reduce((sum, g) => sum + g.tva, 0);
  const totalTtc = totalHt + totalTva;

  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + validityDays);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Apercu du devis</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Preview content */}
        <div className="p-8 space-y-6">
          {/* Emetteur + Client */}
          {(company || client) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
              {company && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">De</p>
                  <p className="font-semibold text-gray-900">{company.name ?? '—'}</p>
                  {company.address && <p className="text-sm text-gray-700">{company.address}</p>}
                  {(company.zip_code || company.city) && (
                    <p className="text-sm text-gray-700">{company.zip_code} {company.city}</p>
                  )}
                  {company.siret && <p className="text-xs text-gray-500 mt-1">SIRET : {company.siret}</p>}
                  {company.tva_number && <p className="text-xs text-gray-500">TVA : {company.tva_number}</p>}
                </div>
              )}
              {client && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Pour</p>
                  <p className="font-semibold text-gray-900">{client.name ?? '—'}</p>
                  {client.address && <p className="text-sm text-gray-700">{client.address}</p>}
                  {(client.zip_code || client.city) && (
                    <p className="text-sm text-gray-700">{client.zip_code} {client.city}</p>
                  )}
                  {client.siret && <p className="text-xs text-gray-500 mt-1">SIRET : {client.siret}</p>}
                </div>
              )}
            </div>
          )}

          {/* Company + meta */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900">DEVIS</h3>
              <p className="text-sm text-gray-500 mt-1">Brouillon</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Date : {new Date().toLocaleDateString('fr-FR')}</p>
              <p>Validite : {validityDate.toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {title && (
            <div>
              <p className="text-base font-medium text-gray-800">{title}</p>
            </div>
          )}

          {/* Lines table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-2 text-left font-semibold text-gray-700">Designation</th>
                <th className="py-2 text-right font-semibold text-gray-700 w-16">Qte</th>
                <th className="py-2 text-center font-semibold text-gray-700 w-14">Unite</th>
                <th className="py-2 text-right font-semibold text-gray-700 w-24">P.U. HT</th>
                <th className="py-2 text-center font-semibold text-gray-700 w-14">TVA</th>
                <th className="py-2 text-right font-semibold text-gray-700 w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                if (line.type === 'section') {
                  return (
                    <tr key={line.id} className="bg-gray-50">
                      <td colSpan={6} className="py-2 font-semibold text-gray-700">
                        {line.label || 'Section'}
                      </td>
                    </tr>
                  );
                }
                if (line.type === 'comment') {
                  return (
                    <tr key={line.id}>
                      <td colSpan={6} className="py-1 text-gray-500 italic text-xs">
                        {line.label}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-800">{line.label || '—'}</td>
                    <td className="py-2 text-right text-gray-700">{line.quantity}</td>
                    <td className="py-2 text-center text-gray-500">{line.unit}</td>
                    <td className="py-2 text-right text-gray-700">{formatCents(line.unit_price_cents)}</td>
                    <td className="py-2 text-center text-gray-500">{formatRate(line.tva_rate)}</td>
                    <td className="py-2 text-right font-medium text-gray-800">{formatCents(line.total_ht_cents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total HT</span>
                <span className="font-medium">{formatCents(totalHt)}</span>
              </div>
              {Array.from(tvaMap.entries()).map(([rate, { base, tva }]) => (
                <div key={rate} className="flex justify-between text-gray-500">
                  <span>TVA {formatRate(rate)}</span>
                  <span>{formatCents(tva)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-300 text-base font-bold">
                <span>Total TTC</span>
                <span>{formatCents(totalTtc)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes / Conditions</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
