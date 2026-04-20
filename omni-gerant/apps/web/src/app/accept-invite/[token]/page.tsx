'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://omni-gerant-api.onrender.com';

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  const [info, setInfo] = useState<{ email: string; role: string; tenantName: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/users/invitation-info/${token}`).then(async (r) => {
      const body = await r.json();
      if (!r.ok) setError(body.error?.message ?? 'Invitation invalide');
      else setInfo(body);
    });
  }, [token]);

  async function accept() {
    if (!password || password.length < 8) { setError('Mot de passe 8+ caractères requis'); return; }
    if (!firstName || !lastName) { setError('Prénom et nom requis'); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`${API}/api/users/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName, lastName, password }),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(body.error?.message ?? 'Erreur'); return; }
    // Redirection vers login avec email prérempli
    router.push(`/login?email=${encodeURIComponent(info?.email ?? '')}&accepted=true`);
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
          <h1 className="text-xl font-bold text-red-700">Invitation invalide</h1>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }
  if (!info) return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">Rejoindre {info.tenantName}</h1>
          <p className="text-sm text-gray-600 mt-2">Vous avez été invité en tant que <strong>{info.role}</strong></p>
          <p className="text-xs text-gray-400 mt-1">Email : {info.email}</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" className="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères min)" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          <button onClick={accept} disabled={submitting} className="w-full bg-primary-600 text-white py-2.5 rounded font-medium hover:bg-primary-700 disabled:opacity-50">
            {submitting ? 'Création…' : 'Créer mon compte et rejoindre'}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Invitation valable jusqu'au {new Date(info.expiresAt).toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
