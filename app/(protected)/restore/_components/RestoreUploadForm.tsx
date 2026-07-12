'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, X, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { restoreService, type DryRunResult } from '@/services/restoreService';
import { notify } from '@/lib/notifications';
import { FORMATTING, MAX_RESTORE_FILE_BYTES, ACCEPTED_EXTENSIONS } from '../constants';

interface RestoreUploadFormProps {
  dryRunResult: DryRunResult | null;
  onDryRunResult: (result: DryRunResult | null) => void;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  replaceExisting: boolean;
  onReplaceExistingChange: (val: boolean) => void;
  targetTenantId: string;
  onTargetTenantIdChange: (val: string) => void;
  onConfirmRestore: () => void;
  isRunning: boolean;
  uploadProgress: number;
}

export function RestoreUploadForm({
  dryRunResult,
  onDryRunResult,
  selectedFile,
  onFileSelect,
  replaceExisting,
  onReplaceExistingChange,
  targetTenantId,
  onTargetTenantIdChange,
  onConfirmRestore,
  isRunning,
  uploadProgress,
}: RestoreUploadFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const router = useRouter();

  const handleFile = async (file: File | null) => {
    setError(null);
    onDryRunResult(null);
    if (!file) {
      onFileSelect(null);
      return;
    }
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError('Only .sql files are supported.');
      return;
    }
    if (file.size > MAX_RESTORE_FILE_BYTES) {
      setError(`File is too large (${FORMATTING.humanFileSize(file.size)}). Maximum allowed is ${FORMATTING.humanFileSize(MAX_RESTORE_FILE_BYTES)}.`);
      return;
    }
    onFileSelect(file);
  };

  const handleDryRun = async () => {
    if (!selectedFile) return;
    setError(null);
    setDryRunLoading(true);
    try {
      const result = await restoreService.dryRun(selectedFile, targetTenantId || undefined);
      onDryRunResult(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Dry run failed');
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  };

  const validResult = dryRunResult?.valid && dryRunResult.mode !== 'unknown';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Upload SQL Backup</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Mode is auto-detected from the file header. The dry-run preview shows what will happen before any change is made.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.getElementById('restore-file-input') as HTMLInputElement;
          input?.click();
        }}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input
          id="restore-file-input"
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {!selectedFile ? (
          <div className="space-y-2">
            <Upload className="w-8 h-8 text-gray-400 mx-auto" />
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drag & drop your .sql file here
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              or click to browse · Max {FORMATTING.humanFileSize(MAX_RESTORE_FILE_BYTES)} · .sql only
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedFile.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {FORMATTING.humanFileSize(selectedFile.size)}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFile(null);
              }}
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {selectedFile && !isRunning && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDryRun}
            disabled={dryRunLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {dryRunLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {dryRunLoading ? 'Analysing…' : 'Dry Run Preview'}
          </button>
          {dryRunResult && validResult && (
            <button
              onClick={onConfirmRestore}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700"
            >
              <AlertTriangle className="w-4 h-4" />
              {dryRunResult.mode === 'full' ? 'Proceed with Full Restore' : 'Restore Tenant Data'}
            </button>
          )}
        </div>
      )}

      {isRunning && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
