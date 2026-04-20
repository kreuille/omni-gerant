'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!companyName.trim()) {
      setError('Veuillez saisir le nom de votre entreprise');
      setLoading(false);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir un email valide');
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    try {
      const result = await api.post<{
        tokens: { access_token: string; refresh_token: string };
        user: { id: string; email: string; role: string; tenant_id: string };
      }>('/api/auth/register', {
        company_name: companyName,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });

      if (result.ok) {
        localStorage.setItem('access_token', result.value.tokens.access_token);
        localStorage.setItem('refresh_token', result.value.tokens.refresh_token);
        // Set auth cookie for middleware
        document.cookie = `auth_token=${result.value.tokens.access_token}; path=/; max-age=${60*60*24*7}; SameSite=Lax`;
        localStorage.setItem('user', JSON.stringify(result.value.user));
        router.push('/');
      } else {
        setError(result.error.message ?? 'Erreur lors de l\'inscription');
      }
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">zenAdmin</h1>
          <p className="mt-2 text-gray-600">Créez votre compte gratuit</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                id="company"
                label="Nom de l'entreprise"
                placeholder="Ma Société SARL"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="firstName"
                  label="Prénom"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  id="lastName"
                  label="Nom"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                label="Mot de passe"
                type="password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creation...' : 'Créer mon compte'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
