'use client';

import { useState } from 'react';
import { Database, Loader2, Info } from 'lucide-react';
import { backupService } from '@/services';
import { notify, confirm } from '@/lib/notifications';
import { FORMATTING, SYNC_THRESHOLD_BYTES } from '../constants';
import type { BackupJobStatus } from '@/services/backupService';

interface FullDbBackupPanelProps {
  tableCount: number;
  tenantCount: number;
  onJobStarted: (job: BackupJobStatus) => void;
}

export function FullDbBackupPanel({ tableCount, tenantCount, onJobStarted }: FullDbBackupPanelProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleBackup = async () => {
    const ok = await confirm({
      title: 'Full database backup?',
      html: `<p class="text-sm">This will dump the entire <b>${tableCount}-table</b> database (all tenants, all data) to a <b>.sql.zip</b> archive.</p>` +
            (tenantCount > 0 ? `<p class="text-sm mt-2"><b>${tenantCount}</b> tenant(s) will be included.</p>` : '') +
            `<p class="text-sm mt-2">The archive appears in the history table below — click <b>Download</b> when ready.</p>`,
      icon: 'warning',
      confirmButtonText: 'Start backup',
      cancelButtonText: 'Cancel',
    });
    if (!ok.isConfirmed) return;

    try {
      setSubmitting(true);
      const result = await backupService.backupFullDatabase();
      notify.success('Full database backup started. Tracking job #' + result.job_id);

      // Poll once to surface the initial state to the parent.
      const status = await backupService.getFullBackupStatus(result.job_id);
      onJobStarted({ ...status, mode: 'full' } as BackupJobStatus);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to start backup');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Full Database Backup</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            A complete mysqldump of the inventory database, with all 81 tables, all tenants, and all shared data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">Tables</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{tableCount}</div>
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">Tenants</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{tenantCount}</div>
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">Threshold</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {FORMATTING.humanFileSize(SYNC_THRESHOLD_BYTES)}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          Files &lt; {FORMATTING.humanFileSize(SYNC_THRESHOLD_BYTES)} run inline; larger files are dispatched to a queued job and progress can be tracked on the page.
          The output file includes the <code className="bg-white/60 dark:bg-black/30 px-1 rounded">UIMS Full Database Backup</code> header.
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleBackup}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {submitting ? 'Starting…' : 'Backup Full Database'}
        </button>
      </div>
    </div>
  );
}
