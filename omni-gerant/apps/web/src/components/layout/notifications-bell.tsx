'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface Notification {
  id: string;
  level: 'info' | 'success' | 'warning' | 'danger';
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
};
const LEVEL_ICON: Record<string, string> = {
  info: 'ℹ', success: '✓', warning: '⚠', danger: '✕',
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    const [list, cnt] = await Promise.all([
      api.get<{ items: Notification[] }>('/api/notifications'),
      api.get<{ count: number }>('/api/notifications/unread-count'),
    ]);
    if (list.ok) setItems(list.value.items ?? []);
    if (cnt.ok) setCount(cnt.value.count ?? 0);
  }

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60_000);
    return () => clearInterval(iv);
  }, []);

  // fermer au clic exterieur
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markRead(id: string) {
    await api.post(`/api/notifications/${id}/read`, {});
    refresh();
  }

  async function markAllRead() {
    await api.post('/api/notifications/read-all', {});
    refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14V11a6 6 0 10-12 0v3a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Aucune notification.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`border-b border-gray-100 last:border-0 ${n.read_at ? 'bg-white' : 'bg-blue-50/40'}`}
                  >
                    <div className="flex gap-3 p-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${LEVEL_COLORS[n.level] ?? LEVEL_COLORS.info}`}>
                        {LEVEL_ICON[n.level] ?? LEVEL_ICON.info}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        {n.body && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-gray-400">
                            {new Date(n.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => { markRead(n.id); setOpen(false); }}
                              className="text-[11px] text-blue-600 hover:underline"
                            >
                              Voir →
                            </Link>
                          )}
                          {!n.read_at && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-[11px] text-gray-500 hover:underline"
                            >
                              Marquer lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
