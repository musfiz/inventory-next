/**
 * Superadmin Backup/Restore Constants
 * Shared between the backup and restore pages.
 */

export const SYNC_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_RESTORE_FILE_BYTES = 500 * 1024 * 1024; // 500 MB hard limit
export const POLL_INTERVAL_MS = 2000;

// Header patterns used for client-side pre-detection (mirrors backend)
export const FULL_DB_HEADER_PATTERN = 'UIMS Full Database Backup';
export const TENANT_HEADER_PATTERN = 'UIMS Tenant Export';

export const ACCEPTED_EXTENSIONS = ['.sql'];

export const FORMATTING = {
  humanFileSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let b = bytes;
    while (b >= 1024 && i < units.length - 1) {
      b /= 1024;
      i++;
    }
    return `${b.toFixed(b >= 10 || i === 0 ? 0 : 2)} ${units[i]}`;
  },
  shortDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  },
  duration(seconds: number | null | undefined): string {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  },
};

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  processing:  { label: 'Processing',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  failed:      { label: 'Failed',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  rolling_back:{ label: 'Rolling Back',color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

export const MODE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  full:    { label: 'Full Database', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', icon: '🗄️' },
  tenant:  { label: 'Per-Tenant',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: '📦' },
  unknown: { label: 'Unknown',       color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200', icon: '❓' },
};
