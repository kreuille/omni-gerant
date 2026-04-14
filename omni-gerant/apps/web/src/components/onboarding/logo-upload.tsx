'use client';

import { useState } from 'react';

// BUSINESS RULE [CDC-4]: Upload logo onboarding

interface LogoUploadProps {
  onLogoChange: (file: File | null) => void;
}

export function LogoUpload({ onLogoChange }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onLogoChange(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onLogoChange(null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Logo de l'entreprise (optionnel)
      </label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-3xl text-gray-300">+</span>
          )}
        </div>
        <div>
          <label className="cursor-pointer">
            <span className="text-sm text-blue-600 hover:underline">
              {preview ? 'Changer' : 'Choisir un fichier'}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {preview && (
            <button
              onClick={handleRemove}
              className="block text-sm text-red-500 hover:underline mt-1"
            >
              Supprimer
            </button>
          )}
          <p className="text-xs text-gray-400 mt-1">PNG, JPG ou SVG. Max 2 Mo.</p>
        </div>
      </div>
    </div>
  );
}
