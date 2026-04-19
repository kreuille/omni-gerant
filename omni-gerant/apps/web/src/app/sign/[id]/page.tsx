'use client';

import { use, useEffect, useState } from 'react';

interface Sig {
  id: string; contractType: string; status: string; documentHash: string;
  signedByEmployerAt: string | null; signedByEmployeeAt: string | null;
}

const API = process.env['NEXT_PUBLIC_API_URL'] || 'https://omni-gerant-api.onrender.com';

export default function SignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sig, setSig] = useState<Sig | null>(null);
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/hr/signatures/${id}/view`).then((r) => r.json()).then(setSig);
  }, [id]);

  async function sign() {
    if (!email || !accepted) return;
    setMessage(null);
    const r = await fetch(`${API}/api/hr/signatures/${id}/sign-employee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((r) => r.json());
    if (r.status === 'fully_signed') {
      setMessage('Contrat signé avec succès. Vous pouvez le télécharger ci-dessous.');
      setSig({ ...sig!, status: 'fully_signed', signedByEmployeeAt: new Date().toISOString() });
    } else {
      setMessage(r.error?.message ?? JSON.stringify(r));
    }
  }

  if (!sig) return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement…</div>;

  const fullySigned = sig.status === 'fully_signed';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Signature électronique du contrat</h1>
          <p className="text-sm text-gray-500">Type : <strong>{sig.contractType.toUpperCase()}</strong> · Hash : <code className="text-xs">{sig.documentHash.slice(0, 16)}…</code></p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Statut de la signature</h2>
          <ul className="text-sm space-y-1">
            <li>{sig.signedByEmployerAt ? '✅' : '⏳'} Signature employeur {sig.signedByEmployerAt ? `le ${new Date(sig.signedByEmployerAt).toLocaleString('fr-FR')}` : 'en attente'}</li>
            <li>{sig.signedByEmployeeAt ? '✅' : '⏳'} Signature salarié {sig.signedByEmployeeAt ? `le ${new Date(sig.signedByEmployeeAt).toLocaleString('fr-FR')}` : 'en attente'}</li>
          </ul>
        </div>

        <iframe src={`${API}/api/hr/signatures/${id}/document`} title="Contrat" className="w-full h-[500px] bg-white border border-gray-200 rounded-lg" />

        {!fullySigned && !sig.signedByEmployeeAt && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Signer électroniquement</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs uppercase text-gray-600 block mb-1">Votre email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
                <span>Je confirme avoir lu le contrat ci-dessus et je le signe électroniquement. Cette signature a valeur juridique (eIDAS règlement UE 910/2014).</span>
              </label>
              <button onClick={sign} disabled={!email || !accepted} className="bg-primary-600 text-white px-5 py-2 rounded font-medium hover:bg-primary-700 disabled:opacity-50">
                Signer le contrat
              </button>
            </div>
          </div>
        )}

        {message && <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">{message}</div>}

        {fullySigned && (
          <a href={`${API}/api/hr/signatures/${id}/document`} target="_blank" rel="noopener noreferrer" className="block text-center bg-green-600 text-white px-5 py-3 rounded font-medium hover:bg-green-700">
            Télécharger le contrat signé
          </a>
        )}
      </main>
    </div>
  );
}
