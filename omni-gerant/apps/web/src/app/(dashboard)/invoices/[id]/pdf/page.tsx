'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function InvoicePdfPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/invoices/${params.id}`} className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Retour a la facture
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1">Apercu PDF</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Telecharger</Button>
          <Button>Envoyer</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-64 ml-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
