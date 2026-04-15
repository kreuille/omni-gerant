'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// BUSINESS RULE [CDC-2.2]: OCR Mobile (V-IA) - scanner tickets de caisse

interface OcrUploadProps {
  onExtracted?: (result: OcrResult) => void;
}

interface OcrResult {
  document_type: string;
  fields: {
    supplier_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    due_date: string | null;
    total_ht_cents: number | null;
    total_tva_cents: number | null;
    total_ttc_cents: number | null;
  };
  lines: Array<{
    label: string;
    quantity: number;
    unit_price_cents: number;
    tva_rate: number;
    total_ht_cents: number;
    confidence: number;
  }>;
  overall_confidence: number;
  warnings: string[];
}

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.tiff,.bmp';

export function OcrUpload({ onExtracted }: OcrUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      // Preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        // TODO: Connect to actual OCR API endpoint
        const response = await fetch('/api/purchases/ocr', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message ?? 'Erreur OCR');
        }

        const result = (await response.json()) as OcrResult;
        onExtracted?.(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'extraction');
      } finally {
        setIsProcessing(false);
      }
    },
    [onExtracted],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Scanner un document</h3>

        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {preview && (
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="max-h-32 mx-auto rounded"
              />
            </div>
          )}

          {isProcessing ? (
            <div className="space-y-2">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500">Extraction en cours...</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Glissez un document ici ou cliquez pour selectionner
              </p>
              <p className="text-xs text-gray-400">PDF, PNG, JPG, TIFF - Max 20 Mo</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
