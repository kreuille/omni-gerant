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

    if (contentType.includes('text/html')) {
      const html = await blob.text();
      const win = window.open('', '_blank');
      if (!win) return { ok: false, error: 'Bloqueur de popup actif — autorisez les popups' };
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      // Petit delai puis impression (pour PDF via navigateur)
      setTimeout(() => { try { win.print(); } catch { /* ok */ } }, 400);
      return { ok: true };
    }

    // Binary (PDF/CSV/autre) : download
    const objectUrl = URL.createObjectURL(blob);
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
