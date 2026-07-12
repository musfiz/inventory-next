'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, RefreshCw } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { restoreService, type DryRunResult, type RestoreJobStatus } from '@/services/restoreService';
import { confirm, notify } from '@/lib/notifications';
import { BackupProgressModal, JobProgress } from '../backup/_components/BackupProgressModal';
import { RestoreUploadForm } from './_components/RestoreUploadForm';
import { DryRunReport } from './_components/DryRunReport';
import { RestoreHistoryTable } from './_components/RestoreHistoryTable';
import { POLL_INTERVAL_MS } from './constants';

export default function RestorePage() {
  const router = useRouter();
  const { isSuperAdmin, isHydrated } = usePermissions();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [targetTenantId, setTargetTenantId] = useState('');
  const [activeJob, setActiveJob] = useState<RestoreJobStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) router.push('/access-denied');
  }, [isSuperAdmin, isHydrated, router]);

  // Poll the active restore job while the modal is open.
  useEffect(() => {
    if (!modalOpen || !activeJob) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await restoreService.getRestoreStatus(activeJob.id);
        if (cancelled) return;
        setActiveJob(next);
        if (next.status === 'completed' || next.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setHistoryKey((k) => k + 1);
        }
      } catch {
        // ignore
      }
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [modalOpen, activeJob]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!selectedFile || !dryRunResult?.valid) return;
    if (dryRunResult.mode === 'full') {
      const ok = await confirm({
        title: '⚠️ Full database restore',
        html: `<p class="text-sm">This will <b>replace the ENTIRE database</b>.</p>` +
              `<p class="text-sm mt-2">All tenants, all data, all tables will be overwritten by the contents of the uploaded .sql file.</p>` +
              `<p class="text-sm mt-2">A full snapshot will be taken first so the change can be rolled back if needed.</p>`,
        icon: 'warning',
        confirmButtonText: 'Yes, replace the entire database',
        cancelButtonText: 'Cancel',
      });
      if (!ok.isConfirmed) return;
    } else {
      const ok = await confirm({
        title: 'Restore tenant data?',
        text: 'Existing data for the target tenant will be replaced. A snapshot will be created first.',
        icon: 'warning',
        confirmButtonText: 'Restore',
        cancelButtonText: 'Cancel',
      });
      if (!ok.isConfirmed) return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const job = await restoreService.restoreDatabase(selectedFile, {
        mode: 'auto',
        tenantId: targetTenantId || undefined,
        replaceExisting,
        onUploadProgress: (e: any) => {
          if (e.total) {
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      setActiveJob(job);
      setModalOpen(true);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      notify.error(err?.response?.data?.message || 'Restore failed');
    }
  }, [selectedFile, dryRunResult, replaceExisting, targetTenantId]);

  if (!isHydrated) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-500">Loading…</div>;
  }
  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Restore Database
        </h1>
        <button
          onClick={() => setHistoryKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <RestoreUploadForm
        dryRunResult={dryRunResult}
        onDryRunResult={setDryRunResult}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        replaceExisting={replaceExisting}
        onReplaceExistingChange={setReplaceExisting}
        targetTenantId={targetTenantId}
        onTargetTenantIdChange={setTargetTenantId}
        onConfirmRestore={handleConfirmRestore}
        isRunning={isUploading}
        uploadProgress={uploadProgress}
      />

      {dryRunResult && (
        <DryRunReport
          result={dryRunResult}
          replaceExisting={replaceExisting}
          onReplaceExistingChange={setReplaceExisting}
          targetTenantId={targetTenantId}
          onTargetTenantIdChange={setTargetTenantId}
        />
      )}

      <div key={historyKey}>
        <RestoreHistoryTable />
      </div>

      <BackupProgressModal
        open={modalOpen && activeJob !== null}
        title={
          activeJob?.detected_mode === 'full' ? 'Full Database Restore'
            : activeJob?.detected_mode === 'tenant' ? 'Tenant Restore'
            : 'Database Restore'
        }
        subtitle={
          activeJob
            ? `Job #${activeJob.id}${activeJob.detected_tenant_name ? ` · ${activeJob.detected_tenant_name}` : ''}`
            : undefined
        }
        job={activeJob as unknown as JobProgress | null}
        onClose={() => {
          setModalOpen(false);
          // Clear the form on success so the user can do another restore.
          if (activeJob?.status === 'completed') {
            setSelectedFile(null);
            setDryRunResult(null);
          }
        }}
      />
    </div>
  );
}
