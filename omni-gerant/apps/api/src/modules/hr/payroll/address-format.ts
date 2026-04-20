// BUSINESS RULE [CDC-RH-V2]: Formater une adresse stockee en JSON en texte lisible
// L'adresse tenant est stockee en Json : { line1, line2?, zip_code, city, country }

interface AddressJson {
  line1?: string;
  line2?: string;
  zip_code?: string;
  zip?: string;
  city?: string;
  country?: string;
}

export function formatAddress(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    // Deja formate, ou JSON legacy
    try {
      const parsed = JSON.parse(raw);
      return formatAddress(parsed);
    } catch {
      return raw; // simple string
    }
  }
  if (typeof raw !== 'object') return null;
  const addr = raw as AddressJson;
  const parts = [
    addr.line1,
    addr.line2,
    [addr.zip_code ?? addr.zip, addr.city].filter(Boolean).join(' ').trim(),
    addr.country && addr.country !== 'FR' ? addr.country : null,
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
  return parts.length > 0 ? parts.join(', ') : null;
}
