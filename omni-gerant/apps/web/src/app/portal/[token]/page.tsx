'use client';

import { use, useEffect, useState } from 'react';

interface Payslip { id: string; year: number; month: number; grossCents: number; netCents: number; sentAt: string | null }
interface PortalData { employee: { firstName: string; lastName: string; email: string | null }; payslips: Payslip[] }

const API = process.env['NEXT_PUBLIC_API_URL'] || 'https://omni-gerant-api.onrender.com';
const MONTHS = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/hr/portal/verify?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error?.message ?? 'Acces refuse');
        setData(body);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  function euro(c: number) { return (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'; }

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
        <h1 className="text-xl font-bold text-red-700">Acces refuse</h1>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <p className="text-xs text-gray-500 mt-4">Demandez un nouveau lien à votre employeur.</p>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-gray-500">Portail salarié zenAdmin</div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour {data.employee.firstName} {data.employee.lastName}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Vos bulletins de paie</h2>
          {data.payslips.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 border rounded">Aucun bulletin disponible pour le moment.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                    <th className="px-4 py-3">Période</th>
                    <th className="px-4 py-3 text-right">Brut</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3">Envoyé</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.payslips.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-right">{euro(p.grossCents)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{euro(p.netCents)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.sentAt ? new Date(p.sentAt).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-4 py-3 text-right"><a href={`${API}/api/hr/portal/payslip/${p.id}?token=${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm font-medium">Télécharger</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-10">
          Lien valable 24h. Conservez vos bulletins — l'employeur n'a pas l'obligation de les conserver au-delà de 5 ans.
        </div>
      </main>
    </div>
  );
}
