'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, FileImage, X } from 'lucide-react';

interface ProofUploadProps {
  onFileSelect?: (file: File) => void;
  className?: string;
}

export default function ProofUpload({
  onFileSelect,
  className = '',
}: ProofUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelect?.(file);
      // TODO: Upload screenshot to Supabase storage bucket 'payment_proofs'
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileName(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-stone-400">
        Upload Bank / Telebirr Receipt Screenshot
      </label>

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
          selectedFileName
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-neutral-300 dark:border-stone-800 bg-neutral-50/80 dark:bg-[#1C1109]/50 hover:border-[#2B1810]/50 hover:bg-neutral-100/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {selectedFileName ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex items-center gap-2 max-w-full px-2">
              <FileImage size={16} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-neutral-800 dark:text-stone-200 truncate">
                {selectedFileName}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-neutral-400 hover:text-rose-500 hover:bg-white"
                aria-label="Clear file"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              Receipt ready for verification
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#2B1810]/10 dark:bg-[#2B1810]/40 text-[#2B1810] dark:text-amber-400 flex items-center justify-center">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-stone-200">
                Click or drag screenshot here
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-stone-400 mt-0.5">
                Supports PNG, JPG, or PDF mobile payment receipts
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
