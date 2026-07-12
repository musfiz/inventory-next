'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { FORMATTING, STATUS_LABELS } from '../constants';

export interface JobProgress {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolling_back';
  progress_percent: number;
  current_table?: string | null;
  tables_done?: number;
  tables_total?: number;
  file_size_bytes?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

interface BackupProgressModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  job: JobProgress | null;
  onClose: () => void;
  onComplete?: (job: JobProgress) => void;
  onFailed?: (job: JobProgress) => void;
}

/**
 * Shared progress modal used by the backup and restore pages while a
 * queued job runs. Polls the caller-supplied status fetcher at a fixed
 * interval until the job reaches a terminal state.
 */
export function BackupProgressModal({
  open,
  title,
  subtitle,
  job,
  onClose,
  onComplete,
  onFailed,
}: BackupProgressModalProps) {
  if (!open || !job) return null;

  const isTerminal = job.status === 'completed' || job.status === 'failed';
  const style = STATUS_LABELS[job.status] ?? STATUS_LABELS.pending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {isTerminal && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.color}`}>
            {style.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
            <span>
              {job.tables_done != null && job.tables_total != null && job.tables_total > 0
                ? `${job.tables_done} / ${job.tables_total} tables`
                : `${job.progress_percent}%`}
            </span>
            <span>{job.progress_percent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                job.status === 'failed'
                  ? 'bg-red-500'
                  : job.status === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, job.progress_percent))}%` }}
            />
          </div>
        </div>

        {/* Current table / details */}
        {job.current_table && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Current: <span className="font-mono">{job.current_table}</span>
          </p>
        )}

        {job.status === 'failed' && job.error_message && (
          <div className="flex items-start gap-2 mt-3 p-2 rounded border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="whitespace-pre-wrap break-words">{job.error_message}</div>
          </div>
        )}

        {job.status === 'completed' && (
          <div className="flex items-start gap-2 mt-3 p-2 rounded border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-xs text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Completed successfully
              {job.file_size_bytes != null && job.file_size_bytes > 0 && (
                <span> · File size: {FORMATTING.humanFileSize(job.file_size_bytes)}</span>
              )}
            </div>
          </div>
        )}

        {job.status === 'rolling_back' && (
          <div className="flex items-start gap-2 mt-3 p-2 rounded border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
            <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
            <div>Restoration failed — rolling back from snapshot…</div>
          </div>
        )}

        {isTerminal && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                if (job.status === 'completed') onComplete?.(job);
                if (job.status === 'failed') onFailed?.(job);
                onClose();
              }}
              className="px-4 py-1.5 text-sm font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        )}

        {!isTerminal && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 text-center">
            Do not close this window — the operation is running in the background.
          </p>
        )}
      </div>
    </div>
  );
}
