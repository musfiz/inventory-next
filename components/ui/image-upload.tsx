'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  currentUrl?: string | null;
  onFileChange: (file: File | null) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export default function ImageUpload({
  currentUrl,
  onFileChange,
  label = 'Image',
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 2,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      setError(null);
      if (!file) {
        setPreview(null);
        onFileChange(null);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Max ${maxSizeMB}MB.`);
        return;
      }
      if (!accept.split(',').includes(file.type)) {
        setError('Invalid file type. Use JPG, PNG, or WebP.');
        return;
      }
      setPreview(URL.createObjectURL(file));
      onFileChange(file);
    },
    [accept, maxSizeMB, onFileChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileChange]);

  const displayUrl = preview || currentUrl;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
          ${displayUrl ? 'border-indigo-300 dark:border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'}
          bg-gray-50 dark:bg-gray-800/50`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0] ?? null)}
        />

        {displayUrl ? (
          <div className="relative inline-block">
            <img
              src={displayUrl}
              alt="Preview"
              className="max-h-40 rounded object-contain"
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleRemove(); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Upload className="w-6 h-6" />
            <span className="text-xs">Drop or click to upload</span>
            <span className="text-[10px]">JPG, PNG, WebP · max {maxSizeMB}MB</span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
