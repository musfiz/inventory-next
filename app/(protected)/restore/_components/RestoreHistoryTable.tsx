'use client';

import { useEffect, useState } from 'react';
import { History, RefreshCw, Download, RotateCcw } from 'lucide-react';
import { restoreService } from '@/services/restoreService';
import { notify } from '@/lib/notifications';
import { FORMATTING, MODE_LABELS, STATUS_LABELS } from '../constants';
import type { RestoreJobStatus } from '@/services/restoreService';

export function RestoreHistoryTable() {
  const [rows, setRows] = useState<RestoreJobStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await restoreService.getRestoreHistory(20);
      setRows(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleRollback = async (snapshotFile: string | null) => {
    if (!snapshotFile) {
      notify.error('No snapshot recorded for this restore.');
      return;
    }
    const ok = await (await import('@/lib/notifications')).confirm({
      title: 'Rollback from snapshot?',
      text: 'This will re-import the pre-restore snapshot file.',
      icon: 'warning',
      confirmButtonText: 'Rollback',
      cancelButtonText: 'Cancel',
    });
    if (!ok.isConfirmed) return;
    try {
      await restoreService.rollback(snapshotFile);
      notify.success('Rollback started. Refresh history to track progress.');
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Rollback failed');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Restores</h3>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-gray-500">
                  No restores yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const modeStyle = MODE_LABELS[row.detected_mode] ?? MODE_LABELS.unknown;
                const statusStyle = STATUS_LABELS[row.status] ?? STATUS_LABELS.pending;
                return (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-3 py-2 text-xs text-gray-500">#{row.id}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${modeStyle.color}`}>
                        <span>{modeStyle.icon}</span>
                        {modeStyle.label}
                      </span>
                      {row.detected_tenant_name && (
                        <span className="ml-1 text-[11px] text-gray-500">{row.detected_tenant_name}</span>
                      )}
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
                      <div className="flex items-center gap-1">
                        {row.snapshot_file && (
                          <button
                            onClick={async () => {
                              try {
                                const { blobUrl, filename } = await restoreService.downloadSnapshot(row.snapshot_file!);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                              } catch (err: any) {
                                notify.error(err?.response?.data?.message || 'Download failed');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                            title="Download snapshot"
                          >
                            <Download className="w-3 h-3" />
                            Snapshot
                          </button>
                        )}
                        <button
                          onClick={() => handleRollback(row.snapshot_file)}
                          className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400"
                          title="Rollback to snapshot"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Rollback
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
  );
}
