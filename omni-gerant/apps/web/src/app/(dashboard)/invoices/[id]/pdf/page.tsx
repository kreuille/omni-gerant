'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'https://omni-gerant-api.onrender.com';

export default function InvoicePdfPage({ params }: { params: { id: string } }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setErrorMsg('Non authentifie');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/invoices/${params.id}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          setErrorMsg('Impossible de generer le PDF');
          return;
        }
        const blob = await res.blob();
        setPdfUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        setErrorMsg('Erreur reseau lors du chargement du PDF');
      })
      .finally(() => setLoading(false));

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `facture-${params.id}.pdf`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/invoices/${params.id}`} className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour a la facture
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Apercu PDF</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={!pdfUrl}>
            Telecharger
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-64 ml-auto" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[80vh] border-0 rounded"
              title="Apercu PDF facture"
            />
          ) : (
            <p className="text-center text-gray-500 py-12">
              {errorMsg || 'PDF non disponible'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
