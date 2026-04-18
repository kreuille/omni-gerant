'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const loading = true;

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Retour aux factures
            </Link>
            <Skeleton className="h-8 w-48 mt-1" />
          </div>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-64 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour aux factures
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1">Detail facture</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/${params.id}/pdf`}>
            <Button variant="outline">PDF</Button>
          </Link>
          <Button>Finaliser</Button>
        </div>
      </div>
    </div>
  );
}
