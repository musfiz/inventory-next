'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, History, RefreshCw, Download as DownloadIcon, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { backupService, tenantService } from '@/services';
import { notify, confirm } from '@/lib/notifications';
import { FORMATTING, MODE_LABELS, STATUS_LABELS, POLL_INTERVAL_MS } from './constants';
import { BackupModeSelector, BackupMode } from './_components/BackupModeSelector';
import { FullDbBackupPanel } from './_components/FullDbBackupPanel';
import { TenantBackupPanel } from './_components/TenantBackupPanel';
import { BackupProgressModal, JobProgress } from './_components/BackupProgressModal';
import type { BackupJobStatus } from '@/services/backupService';

export default function BackupPage() {
  const router = useRouter();
  const { isSuperAdmin, isHydrated } = usePermissions();
  const [mode, setMode] = useState<BackupMode>('full');
  const [activeJob, setActiveJob] = useState<BackupJobStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tableCount, setTableCount] = useState<number>(0);
  const [tenantCount, setTenantCount] = useState<number>(0);
  const [history, setHistory] = useState<BackupJobStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) router.push('/access-denied');
  }, [isSuperAdmin, isHydrated, router]);

  // Quick DB summary stats
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenants = await tenantService.getTenants(1, 1);
        if (mounted) setTenantCount(tenants.total ?? 0);
      } catch {
        if (mounted) setTenantCount(0);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Approximate table count from public knowledge; this is the count of
  // migration files in the project (88 currently, ~81 production tables).
  useEffect(() => {
    setTableCount(81);
  }, []);

  const refreshHistory = useCallback(async () => {
    setRefreshing(true);
    try {
      const [full, tenant] = await Promise.all([
        backupService.getFullBackupHistory(10),
        backupService.getTenantExportHistory(10),
      ]);
      setHistory([...full, ...tenant].sort((a, b) => (b.id - a.id)));
    } catch {
      // ignore — UI shows empty state
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) refreshHistory();
  }, [isSuperAdmin, refreshHistory]);

  // Poll the active job's status while the modal is open.
  // Depend only on activeJob.id (not the full object) to avoid restarting
  // the interval on every status-update re-render.
  const activeJobRef = useRef(activeJob);
  activeJobRef.current = activeJob;

  useEffect(() => {
    if (!modalOpen || !activeJobRef.current) return;
    const { id, mode, status } = activeJobRef.current;
    if (status === 'completed' || status === 'failed') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const next = mode === 'full'
          ? await backupService.getFullBackupStatus(id)
          : await backupService.getTenantExportStatus(id);
        if (cancelled) return;

        setActiveJob(prev => {
          if (!prev || prev.id !== id) return prev;
          if (prev.status === next.status &&
              prev.progress_percent === next.progress_percent &&
              prev.tables_done === next.tables_done) {
            return prev; // no-op — skip re-render
          }
          return next;
        });

        if (next.status === 'completed' || next.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          refreshHistory();
        }
      } catch {
        // swallow — will retry on next interval
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [modalOpen, activeJob?.id, refreshHistory]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleJobStarted = (job: BackupJobStatus) => {
    setActiveJob(job);
    setModalOpen(true);
    // Fast jobs can already be terminal by the time the first status
    // fetch lands (sync queue / tiny tenant). The polling effect skips
    // terminal jobs, so refresh the history here or the new backup won't
    // appear in the list until a manual reload.
    if (job.status === 'completed' || job.status === 'failed') {
      refreshHistory();
    }
  };

  const handleDelete = async (job: BackupJobStatus) => {
    const ok = await confirm({
      title: 'Delete backup?',
      html: `<p class="text-sm">Delete <b>${job.original_filename}</b>? This removes the record and the file from disk.</p>`,
      icon: 'warning',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!ok.isConfirmed) return;
    try {
      await backupService.deleteBackup(job.id);
      notify.success('Backup deleted');
      refreshHistory();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete backup');
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-500">Loading…</div>
    );
  }
  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Database Backup
        </h1>
        <button
          onClick={refreshHistory}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {refreshing ? 'Refreshing…' : 'Refresh history'}
        </button>
      </div>

      {/* Mode selector */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Choose backup mode</h2>
        <BackupModeSelector
          mode={mode}
          onChange={setMode}
          disabled={modalOpen}
        />
      </div>

      {/* Active panel */}
      {mode === 'full' ? (
        <FullDbBackupPanel
          tableCount={tableCount}
          tenantCount={tenantCount}
          onJobStarted={handleJobStarted}
        />
      ) : (
        <TenantBackupPanel onJobStarted={handleJobStarted} />
      )}

      {/* History */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Backups</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/30 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-left px-3 py-2">File</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Size</th>
                <th className="text-left px-3 py-2">Started</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-gray-500">
                    No backups yet — start one above.
                  </td>
                </tr>
              ) : (
                history.map((row, index) => {
                  const modeStyle = MODE_LABELS[row.mode] ?? MODE_LABELS.unknown;
                  const statusStyle = STATUS_LABELS[row.status] ?? STATUS_LABELS.pending;
                  return (
                    <tr key={`${row.mode}-${row.id}`} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2 text-xs text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${modeStyle.color}`}>
                          <span>{modeStyle.icon}</span>
                          {modeStyle.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate" title={row.original_filename}>
                        {row.original_filename}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{FORMATTING.humanFileSize(row.file_size_bytes)}</td>
                      <td className="px-3 py-2 text-xs">{FORMATTING.shortDateTime(row.started_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {row.status === 'completed' ? (
                            <button
                              onClick={async () => {
                                try {
                                  const { blobUrl, filename } = await backupService.downloadBackup(row.id, row.mode);
                                  backupService.triggerBrowserDownload(blobUrl, filename);
                                } catch (err: any) {
                                  notify.error(err?.response?.data?.message || 'Download failed');
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                            >
                              <DownloadIcon className="w-3 h-3" />
                              Download
                            </button>
                          ) : row.status === 'failed' ? (
                            <span className="text-xs text-red-500" title={row.error_message ?? ''}>
                              {row.error_message ? 'Error' : '—'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          <button
                            onClick={() => handleDelete(row)}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                            title="Delete backup"
                           aria-label="Delete backup">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

        <BackupProgressModal
          open={modalOpen && activeJob !== null}
          title={activeJob?.mode === 'full' ? 'Full Database Backup' : 'Tenant Export'}
          subtitle={activeJob ? `Job #${activeJob.id}` : undefined}
          job={activeJob as JobProgress | null}
          onClose={() => setModalOpen(false)}
        />
    </div>
  );
}
