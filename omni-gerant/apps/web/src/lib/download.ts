// BUSINESS RULE [CDC-6]: Telechargement de documents depuis l'API authentifiee
//
// Les endpoints API (/api/hr/*, /api/invoices/*, etc.) requierent un header
// Authorization: Bearer <token>. Un simple <a href="..."> ne l'envoie pas.
// Cette helper fetche avec le token, detecte le content-type, et ouvre ou
// telecharge selon le format (HTML imprimable ou PDF/CSV binaire).

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'https://omni-gerant-api.onrender.com';

/**
 * Ouvre un document protege dans un nouvel onglet avec le token JWT.
 * Si c'est du HTML : ouvre avec print auto pour generer PDF cote navigateur.
 * Si c'est du binaire : force le download avec filename.
 */
export async function openAuthenticatedDocument(path: string, suggestedFilename = 'document'): Promise<{ ok: boolean; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!token) return { ok: false, error: 'Non authentifié' };

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status} : ${text.slice(0, 200)}` };
    }
    const contentType = res.headers.get('content-type') ?? '';
    const blob = await res.blob();

    // Strategie unifiee : creer une blob URL et ouvrir/telecharger
    const objectUrl = URL.createObjectURL(blob);

    if (contentType.includes('text/html') || contentType.includes('application/pdf')) {
      // Ouvre dans le meme onglet avec blob URL — evite le popup blocker.
      // L'utilisateur peut revenir avec la fleche retour navigateur.
      // Alternative : creer un lien temporaire et cliquer (donne UX download + preview).
      const a = document.createElement('a');
      a.href = objectUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = contentType.includes('text/html') ? '' : suggestedFilename; // HTML : preview, PDF : download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      return { ok: true };
    }

    // Binary (CSV/autre) : force download
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = suggestedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error).message) };
  }
}
