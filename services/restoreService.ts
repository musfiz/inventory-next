import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

/**
 * Restore Service
 *
 * Uploads .sql backups to the server for restore. The mode is auto-detected
 * from the SQL header by the backend, but the UI can preview the detected
 * mode via the dry-run endpoint before committing.
 *
 *   POST /api/v1/db/restore                  → upload + restore
 *   POST /api/v1/db/restore/dry-run          → preview only
 *   GET  /api/v1/db/restore/{job}/status     → poll progress
 *   GET  /api/v1/db/restore/history          → list
 *   POST /api/v1/db/restore/rollback         → manual rollback
 *   GET  /api/v1/db/restore/snapshot/download → download a snapshot
 *
 * Note: endpoints are gated server-side by an inline super-admin check
 * in the controller. The frontend also gates the corresponding pages
 * with `isSuperAdmin` from `usePermissions()`.
 */

export type BackupMode = 'full' | 'tenant' | 'unknown';

/**
 * Restore strategy:
 *   fresh — replace: wipe/truncate the target (or the dump's own DROP/CREATE)
 *           and import. Existing data is discarded.
 *   merge — additive: keep existing data, insert only rows that don't exist.
 */
export type RestoreStrategy = 'fresh' | 'merge';

export type RestoreStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rolling_back';

export interface RestoreSummary {
  tables_affected?: number;
  duration_seconds?: number;
  snapshot_file?: string;
  mode?: string;
  [key: string]: any;
}

export interface RestoreJobStatus {
  id: string;
  detected_mode: BackupMode;
  detected_tenant_id: string | null;
  detected_tenant_name: string | null;
  target_tenant_id: string | null;
  target_tenant_name: string | null;
  status: RestoreStatus;
  progress_percent: number;
  current_table: string | null;
  tables_done: number;
  tables_total: number;
  file_size_bytes: number;
  original_filename: string;
  snapshot_file: string | null;
  replace_existing: boolean;
  strategy: RestoreStrategy;
  target_business_type_id: string | null;
  dry_run: boolean;
  error_message: string | null;
  warnings: string[] | null;
  summary: RestoreSummary | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface DryRunResult {
  valid: boolean;
  mode: BackupMode;
  detected_tenant_id: number | null;
  detected_tenant_name: string | null;
  target_tenant_exists: boolean | null;
  file_size_bytes: number;
  estimated_tables: number;
  estimated_rows: number;
  contains_create_table: boolean;
  contains_inserts: boolean;
  contains_drop_table: boolean;
  detected_business_type_ids: string[];
  errors: string[];
  warnings: string[];
}

class RestoreService {
  /**
   * Upload the .sql file and start the restore. Small files run inline
   * (sync); large files return a job_id that must be polled.
   */
  async restoreDatabase(
    file: File,
    options?: {
      mode?: 'auto' | 'full' | 'tenant';
      tenantId?: string | number;
      strategy?: RestoreStrategy;
      replaceExisting?: boolean;
      businessTypeId?: string;
      onUploadProgress?: (progressEvent: any) => void;
    },
  ): Promise<RestoreJobStatus> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options?.mode ?? 'auto');
    if (options?.tenantId !== undefined && options.tenantId !== null) {
      formData.append('tenant_id', String(options.tenantId));
    }
    if (options?.businessTypeId) {
      formData.append('business_type_id', options.businessTypeId);
    }
    if (options?.strategy) {
      formData.append('strategy', options.strategy);
    } else {
      formData.append(
        'replace_existing',
        options?.replaceExisting === false ? '0' : '1',
      );
    }

    const response = await apiClient.post<ApiResponse<RestoreJobStatus>>(
      '/api/v1/db/restore',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: options?.onUploadProgress,
      },
    );
    return response.data.data;
  }

  /** GET /api/v1/db/restore/{jobId}/status */
  async getRestoreStatus(jobId: string): Promise<RestoreJobStatus> {
    const response = await apiClient.get<ApiResponse<RestoreJobStatus>>(
      `/api/v1/db/restore/${jobId}/status`,
    );
    return response.data.data;
  }

  /** GET /api/v1/db/restore/history */
  async getRestoreHistory(limit = 25): Promise<RestoreJobStatus[]> {
    const response = await apiClient.get<ApiResponse<{ rows: RestoreJobStatus[] }>>(
      '/api/v1/db/restore/history',
      { params: { limit } },
    );
    return response.data.data?.rows ?? [];
  }

  /**
   * POST /api/v1/db/restore/dry-run
   * Upload just to analyze; never executes the SQL.
   */
  async dryRun(file: File, tenantId?: string | number): Promise<DryRunResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (tenantId !== undefined && tenantId !== null) {
      formData.append('tenant_id', String(tenantId));
    }
    const response = await apiClient.post<ApiResponse<DryRunResult>>(
      '/api/v1/db/restore/dry-run',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  }

  /** POST /api/v1/db/restore/rollback */
  async rollback(snapshotFile: string): Promise<void> {
    await apiClient.post('/api/v1/db/restore/rollback', {
      snapshot_file: snapshotFile,
    });
  }

  /**
   * GET /api/v1/db/restore/snapshot/download
   * Returns a blob URL the browser can download.
   */
  async downloadSnapshot(snapshotFile?: string, mode?: 'full' | 'tenant'): Promise<{ blobUrl: string; filename: string }> {
    const response = await apiClient.get('/api/v1/db/restore/snapshot/download', {
      params: { snapshot_file: snapshotFile, mode },
      responseType: 'blob',
    });
    const cd = response.headers['content-disposition'] || '';
    const match = cd.match(/filename="?([^";]+)"?/);
    const filename = match?.[1] ?? `snapshot_${Date.now()}.sql`;
    const blob = new Blob([response.data as BlobPart], { type: 'application/sql' });
    return { blobUrl: URL.createObjectURL(blob), filename };
  }
}

export const restoreService = new RestoreService();
export default restoreService;
