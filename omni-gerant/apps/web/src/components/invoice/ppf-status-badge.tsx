'use client';

// BUSINESS RULE [CDC-2.1]: Badge statut transmission PPF

type PpfStatus =
  | 'deposee'
  | 'en_cours_traitement'
  | 'acceptee'
  | 'refusee'
  | 'mise_a_disposition'
  | 'encaissee';

const STATUS_CONFIG: Record<PpfStatus, { label: string; color: string; bgColor: string }> = {
  deposee: { label: 'Deposee', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  en_cours_traitement: { label: 'En traitement', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  acceptee: { label: 'Acceptee', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  refusee: { label: 'Refusee', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  mise_a_disposition: { label: 'Mise a disposition', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  encaissee: { label: 'Encaissee', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
};

const PROGRESS_MAP: Record<PpfStatus, number> = {
  deposee: 20,
  en_cours_traitement: 40,
  acceptee: 60,
  refusee: 100,
  mise_a_disposition: 80,
  encaissee: 100,
};

interface PpfStatusBadgeProps {
  status: PpfStatus;
  ppfId?: string;
  showProgress?: boolean;
  rejectionReason?: string;
}

export function PpfStatusBadge({ status, ppfId, showProgress = false, rejectionReason }: PpfStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const progress = PROGRESS_MAP[status];

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${config.bgColor} ${config.color}`}>
        {status === 'en_cours_traitement' && (
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {status === 'acceptee' || status === 'encaissee' ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
        {status === 'refusee' && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        PPF: {config.label}
      </div>

      {ppfId && (
        <p className="text-xs text-gray-500">ID PPF: {ppfId}</p>
      )}

      {showProgress && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${status === 'refusee' ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {rejectionReason && status === 'refusee' && (
        <p className="text-xs text-red-600 mt-1">Motif: {rejectionReason}</p>
      )}
    </div>
  );
}
