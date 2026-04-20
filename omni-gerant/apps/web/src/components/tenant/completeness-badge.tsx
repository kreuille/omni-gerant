'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

// P2-03 : badge de progression du profil entreprise.

interface Completeness {
  score: number;
  missing_required: string[];
  missing_optional: string[];
  complete: boolean;
}

interface Props {
  variant?: 'compact' | 'full';
  className?: string;
}

function scoreColor(score: number): { ring: string; text: string; bg: string } {
  if (score >= 95) return { ring: 'stroke-green-500', text: 'text-green-700', bg: 'bg-green-50' };
  if (score >= 70) return { ring: 'stroke-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' };
  if (score >= 40) return { ring: 'stroke-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  return { ring: 'stroke-red-500', text: 'text-red-700', bg: 'bg-red-50' };
}

export function CompletenessBadge({ variant = 'compact', className = '' }: Props) {
  const [data, setData] = useState<Completeness | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<Completeness>('/api/tenants/me/completeness').then((r) => {
      if (!cancelled && r.ok) setData(r.value);
    });
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;
  if (data.complete && variant === 'compact') return null; // Profil OK -> pas de badge discret

  const colors = scoreColor(data.score);
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (data.score / 100) * circumference;

  if (variant === 'compact') {
    return (
      <Link
        href="/settings/profile"
        className={`group relative inline-flex items-center gap-2 ${className}`}
        title={`Profil à ${data.score} %. Cliquez pour compléter.`}
      >
        <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
          <circle cx="22" cy="22" r="20" strokeWidth="3" className="stroke-gray-200" fill="none" />
          <circle
            cx="22" cy="22" r="20" strokeWidth="3"
            className={colors.ring}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${colors.text}`} style={{ width: 44 }}>
          {data.score}%
        </span>
      </Link>
    );
  }

  // Variant "full" : card avec liste des champs manquants
  return (
    <div className={`${colors.bg} border border-current/20 rounded-lg p-4 ${colors.text} ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 relative">
          <svg width="72" height="72" viewBox="0 0 44 44" className="-rotate-90">
            <circle cx="22" cy="22" r="20" strokeWidth="4" className="stroke-gray-200" fill="none" />
            <circle
              cx="22" cy="22" r="20" strokeWidth="4"
              className={colors.ring}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${colors.text}`}>
            {data.score}%
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            {data.complete ? 'Profil entreprise complet ✓' : 'Profil entreprise incomplet'}
          </h3>
          {data.missing_required.length > 0 && (
            <p className="text-xs mt-1">
              <strong>Champs obligatoires manquants :</strong>{' '}
              {data.missing_required.join(', ')}
            </p>
          )}
          {data.missing_optional.length > 0 && (
            <p className="text-xs mt-1 opacity-70">
              Optionnels : {data.missing_optional.slice(0, 3).join(', ')}
              {data.missing_optional.length > 3 ? `, +${data.missing_optional.length - 3} autres` : ''}
            </p>
          )}
          <Link
            href="/settings/profile"
            className="inline-block mt-2 text-xs font-medium underline hover:no-underline"
          >
            Compléter mon profil →
          </Link>
        </div>
      </div>
    </div>
  );
}
