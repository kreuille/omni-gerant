'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Veuillez saisir votre email');
      return;
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://omni-gerant-api.onrender.com';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error?.message ?? '';
        const translations: Record<string, string> = {
          'Invalid email or password': 'Email ou mot de passe incorrect',
          'User not found': 'Aucun compte avec cet email',
          'Invalid password': 'Mot de passe incorrect',
        };
        setError(translations[msg] || msg || 'Erreur de connexion');
        return;
      }
      // Store tokens
      document.cookie = `auth_token=${data.tokens.access_token}; path=/; max-age=${60*60*24*7}; SameSite=Lax`;
      localStorage.setItem('access_token', data.tokens.access_token);
      localStorage.setItem('refresh_token', data.tokens.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Redirect to dashboard
      window.location.href = '/';
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">zenAdmin</h1>
          <p className="mt-2 text-gray-600">Connectez-vous à votre espace</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                id="password"
                label="Mot de passe"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Créer un compte
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
