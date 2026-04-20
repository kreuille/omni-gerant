'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { SettingsNav } from '@/components/settings/settings-nav';

interface User {
  id: string; email: string; firstName: string; lastName: string; role: string;
  twoFaEnabled: boolean; lastLoginAt: string | null; createdAt: string;
}
interface Invitation {
  id: string; email: string; role: string; createdAt: string; expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

const ROLES = [
  { v: 'admin', l: 'Administrateur', d: 'Gère tout sauf facturation et suppression' },
  { v: 'member', l: 'Membre', d: 'CRUD ventes, achats, clients, produits' },
  { v: 'accountant', l: 'Comptable', d: 'Lecture seule + export FEC' },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire', admin: 'Administrateur', member: 'Membre', accountant: 'Comptable',
};
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800',
  member: 'bg-green-100 text-green-800', accountant: 'bg-yellow-100 text-yellow-800',
};

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [message, setMessage] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function load() {
    const [u, i] = await Promise.all([
      api.get<{ items: User[] }>('/api/users'),
      api.get<{ items: Invitation[] }>('/api/users/invitations'),
    ]);
    if (u.ok) setUsers(u.value.items);
    if (i.ok) setInvitations(i.value.items);
  }
  useEffect(() => { load(); }, []);

  async function invite() {
    if (!inviteEmail.includes('@')) { setMessage('Email invalide'); return; }
    setInviting(true);
    const r = await api.post<{ token: string; inviteUrl: string; expiresAt: string }>('/api/users/invite', {
      email: inviteEmail, role: inviteRole,
    });
    if (r.ok) {
      try { await navigator.clipboard.writeText(r.value.inviteUrl); } catch { /* ok */ }
      setMessage(`✓ Invitation créée et lien copié ! Envoyez à ${inviteEmail} : ${r.value.inviteUrl}`);
      setInviteEmail('');
      await load();
    } else setMessage('Erreur : ' + r.error.message);
    setInviting(false);
  }

  async function changeRole(userId: string, role: string) {
    const r = await api.patch(`/api/users/${userId}/role`, { role });
    if (r.ok) { setMessage('Rôle mis à jour'); await load(); }
    else setMessage('Erreur : ' + r.error.message);
  }

  async function removeMember(userId: string) {
    if (!confirm('Retirer définitivement cet utilisateur ?')) return;
    const r = await api.delete(`/api/users/${userId}`);
    if (r.ok) { setMessage('Utilisateur retiré'); await load(); }
    else setMessage('Erreur : ' + r.error.message);
  }

  async function revokeInvite(id: string) {
    const r = await api.delete(`/api/users/invitations/${id}`);
    if (r.ok) { await load(); }
    else setMessage('Erreur : ' + r.error.message);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SettingsNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Équipe & permissions</h1>
        <p className="text-sm text-gray-600 mt-1">Invitez vos collaborateurs et gérez leurs accès.</p>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">{message}</div>}

      {/* Invitation form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-semibold mb-3">Inviter un collaborateur</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemple.fr" className="border border-gray-300 rounded px-3 py-2 text-sm md:col-span-1" />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
          <button onClick={invite} disabled={inviting} className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {inviting ? 'Création…' : 'Envoyer invitation'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{ROLES.find((r) => r.v === inviteRole)?.d}</p>
      </div>

      {/* Membres actifs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200"><h2 className="font-semibold">Membres actifs ({users.length})</h2></div>
        {users.length === 0 ? <p className="p-6 text-center text-gray-500">Aucun membre</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-4 py-3">Nom</th><th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th><th className="px-4 py-3">2FA</th>
                <th className="px-4 py-3">Dernière connexion</th><th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[u.role] ?? 'bg-gray-100'}`}>{ROLE_LABELS[u.role] ?? u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{u.twoFaEnabled ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('fr-FR') : 'Jamais'}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'owner' && (
                      <>
                        <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1 mr-2">
                          <option value="admin">Admin</option>
                          <option value="member">Membre</option>
                          <option value="accountant">Comptable</option>
                        </select>
                        <button onClick={() => removeMember(u.id)} className="text-xs text-red-600 hover:underline">Retirer</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invitations */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200"><h2 className="font-semibold">Invitations ({invitations.filter((i) => i.status === 'pending').length} en attente)</h2></div>
        {invitations.length === 0 ? <p className="p-6 text-center text-gray-500">Aucune invitation</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                <th className="px-4 py-3">Email</th><th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th><th className="px-4 py-3">Expire</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((i) => (
                <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{i.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[i.role] ?? i.role}</td>
                  <td className="px-4 py-3 text-xs">{i.status === 'pending' ? '⏳ En attente' : i.status === 'accepted' ? '✓ Acceptée' : i.status === 'expired' ? '⚠ Expirée' : '× Révoquée'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(i.expiresAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right">
                    {i.status === 'pending' && (
                      <button onClick={() => revokeInvite(i.id)} className="text-xs text-red-600 hover:underline">Révoquer</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
