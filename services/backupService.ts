import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

/**
 * Backup Service
 *
 * Handles full-database and per-tenant SQL backup downloads.
 * The mode is selected by the UI before triggering a download.
 *
 *   Full DB:
 *     POST /api/v1/db/backup                       → job_id
 *     GET  /api/v1/db/backup/{job}/status          → progress
 *     GET  /api/v1/db/backup/{job}/download        → blob stream
 *     GET  /api/v1/db/backup/history               → recent jobs
 *
 *   Per-tenant:
 *     POST /api/v1/tenants/{tenantId}/export        → job_id
 *     GET  /api/v1/exports/{job}/status            → progress
 *     GET  /api/v1/exports/{job}/download          → blob stream
 *     GET  /api/v1/exports/history                 → recent jobs
 *
 * Note: endpoints are gated server-side by an inline super-admin check
 * in the controller. The frontend also gates the corresponding pages
 * with `isSuperAdmin` from `usePermissions()`.
 */

export type BackupMode = 'full' | 'tenant';

export type BackupStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface BackupJobStatus {
  id: number;
  mode: BackupMode;
  tenant_id: number | null;
  status: BackupStatus;
  progress_percent: number;
  current_table: string | null;
  tables_done: number;
  tables_total: number;
  file_size_bytes: number | null;
  original_filename: string;
  error_message: string | null;
  summary: Record<string, any> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  tenant_name?: string;
}

interface BackupStartResult {
  job_id: number;
  mode: BackupMode;
  tenant_id?: number;
}

class BackupService {
  // ── Full DB ──────────────────────────────────────────────────────────

  /** POST /api/v1/db/backup */
  async backupFullDatabase(): Promise<BackupStartResult> {
    const response = await apiClient.post<ApiResponse<BackupStartResult>>('/api/v1/db/backup');
    return response.data.data;
  }

  /** GET /api/v1/db/backup/{jobId}/status */
  async getFullBackupStatus(jobId: number): Promise<BackupJobStatus> {
    const response = await apiClient.get<ApiResponse<BackupJobStatus>>(
      `/api/v1/db/backup/${jobId}/status`,
    );
    return response.data.data;
  }

  /** GET /api/v1/db/backup/history */
  async getFullBackupHistory(limit = 20): Promise<BackupJobStatus[]> {
    const response = await apiClient.get<ApiResponse<{ rows: BackupJobStatus[] }>>(
      '/api/v1/db/backup/history',
      { params: { limit } },
    );
    return response.data.data?.rows ?? [];
  }

  // ── Per-Tenant ───────────────────────────────────────────────────────

  /** POST /api/v1/tenants/{tenantId}/export */
  async exportTenant(tenantId: string | number): Promise<BackupStartResult> {
    const response = await apiClient.post<ApiResponse<BackupStartResult>>(
      `/api/v1/tenants/${tenantId}/export`,
    );
    return response.data.data;
  }

  /** GET /api/v1/exports/{jobId}/status */
  async getTenantExportStatus(jobId: number): Promise<BackupJobStatus> {
    const response = await apiClient.get<ApiResponse<BackupJobStatus>>(
      `/api/v1/exports/${jobId}/status`,
    );
    return response.data.data;
  }

  /** GET /api/v1/exports/history */
  async getTenantExportHistory(limit = 20): Promise<BackupJobStatus[]> {
    const response = await apiClient.get<ApiResponse<{ rows: BackupJobStatus[] }>>(
      '/api/v1/exports/history',
      { params: { limit } },
    );
    return response.data.data?.rows ?? [];
  }

  // ── Download helper ──────────────────────────────────────────────────

  /**
   * Stream the produced .sql file from the appropriate endpoint and
   * return a blob URL the caller can hand to the browser for download.
   */
  async downloadBackup(jobId: number, mode: BackupMode): Promise<{ blobUrl: string; filename: string }> {
    const endpoint = mode === 'full'
      ? `/api/v1/db/backup/${jobId}/download`
      : `/api/v1/exports/${jobId}/download`;

    const status = mode === 'full'
      ? await this.getFullBackupStatus(jobId)
      : await this.getTenantExportStatus(jobId);

    const response = await apiClient.get(endpoint, { responseType: 'blob' });
    const contentType = (response.headers['content-type'] as string | undefined) ?? 'application/sql';
    const blob = new Blob([response.data as BlobPart], { type: contentType });
    return {
      blobUrl: URL.createObjectURL(blob),
      filename: status.original_filename,
    };
  }

  /** DELETE /api/v1/backup/{jobId} */
  async deleteBackup(jobId: number): Promise<void> {
    await apiClient.delete(`/api/v1/backup/${jobId}`);
  }

  /**
   * Convenience: trigger a file download in the browser for a blob URL.
   */
  triggerBrowserDownload(blobUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}

export const backupService = new BackupService();
export default backupService;
