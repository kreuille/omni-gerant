'use client';

import { useEffect, useState } from 'react';

// Vague D3 : Install prompt PWA (Add to Home Screen).
// Apparait apres 10s si deferredPrompt est dispo + pas encore installee +
// pas dismiss dans les 30 derniers jours.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'zen_pwa_dismissed_at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const lastDismiss = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    if (lastDismiss && Date.now() - lastDismiss < DISMISS_TTL_MS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 10_000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferred) return null;

  async function onInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const r = await deferred.userChoice;
    if (r.outcome === 'accepted') {
      setVisible(false);
      setDeferred(null);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl">📱</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Installer zenAdmin</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Accédez à vos devis, factures et rappels depuis votre écran d'accueil, même hors ligne.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onInstall}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-1.5 rounded"
            >
              Installer
            </button>
            <button
              onClick={dismiss}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
