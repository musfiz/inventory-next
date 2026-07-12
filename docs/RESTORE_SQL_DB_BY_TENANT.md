# SQL Database Restore — Implementation Plan

> **Implementation note (route shape):** All endpoints in this plan live under the standard `v1` prefix only — there is no `superadmin` URL segment. The controllers are placed in `app/Http/Controllers/Api/` (not `Api/Superadmin/`). Authorization is an inline `isSuperAdmin()` check inside each controller method (no `role:super-admin` middleware alias exists in this project). The frontend page lives at `/restore` (not `/superadmin/restore`) and is gated client-side by `usePermissions().isSuperAdmin`.

## 1. Executive Summary

**Goal:** Provide a UI and Artisan command for the superadmin to upload a previously-exported `.sql` file and restore it into the inventory database. This is the inverse of the [Download SQL plan](./DOWNLOAD_SQL_DB_BY_TENANT.md). The restore system **auto-detects** whether the uploaded file is a **Full Database Backup** or a **Per-Tenant Backup** by reading the SQL header comment, then executes the appropriate restore strategy.

**Current State:** The download plan produces `.sql` files in two modes — each with a distinct header comment (`UIMS Full Database Backup` or `UIMS Tenant Export`). These files are designed to be imported via `mysql -u root -p new_database < file.sql` on the CLI. This plan brings that import into the Next.js UI so a superadmin can restore without SSH/CLI access.

**Two restore scenarios:**

| Scenario | File type detected | Restore behavior |
|----------|-------------------|------------------|
| **Full DB restore** | `UIMS Full Database Backup` header | Replaces the entire database — all tables, all tenants. High-risk; requires extra confirmation. |
| **Per-tenant restore** | `UIMS Tenant Export` header | Restores one tenant's scoped data. Can optionally target a specific `tenant_id` to merge into an existing DB. Lower risk; only affects one tenant's rows. |

**Why this matters:**
- Superadmin can restore the full database or a single tenant's data from the browser
- Disaster recovery without developer intervention (full DB restore)
- Tenant-level data migration/recovery (per-tenant restore)
- The auto-detection means the superadmin doesn't need to manually specify the mode — the system reads the file and handles it correctly
- Symmetric to the download feature — full round-trip from UI

**Is this possible from the Next.js application?** **Yes.** The Next.js frontend uploads the `.sql` file via `multipart/form-data` to a Laravel API endpoint. The Laravel backend validates, detects the backup mode from the header, stores the file, and executes the SQL against MySQL (either via `DB::unprepared()` or shelling out to the `mysql` CLI for large files). Progress is reported back to the UI via polling.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js UI (browser)                                        │
│                                                              │
│  Superadmin selects .sql file                                │
│  ┌────────────────────────────────┐                          │
│  │  Drag & drop / file picker     │                          │
│  │  Validate: .sql extension      │                          │
│  │  Dry-run: auto-detect mode     │                          │
│  │  Confirm dialog (destructive)  │                          │
│  └──────────────┬─────────────────┘                          │
│                 │ POST /api/v1/db/restore          │
│                 │ (multipart/form-data, onUploadProgress)     │
└─────────────────┼────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│  Laravel Backend                                             │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │ Validate file   │───▶│ Detect backup    │                │
│  │ (ext, size,     │    │ mode from header │                │
│  │  magic bytes)   │    │                  │                │
│  └─────────────────┘    └────────┬─────────┘                │
│                                  │                           │
│                    ┌─────────────┴─────────────┐             │
│                    │                           │             │
│                    ▼                           ▼             │
│           ┌────────────────┐          ┌────────────────┐    │
│           │ Full DB Backup │          │ Per-Tenant     │    │
│           │ detected       │          │ Backup detected │    │
│           │                │          │                 │    │
│           │ • Snapshot     │          │ • Snapshot      │    │
│           │   entire DB    │          │   (or affected  │    │
│           │ • DROP all     │          │    tables only) │    │
│           │   tables       │          │ • DELETE tenant │    │
│           │ • Execute full │          │   rows, then    │    │
│           │   SQL dump     │          │   INSERT        │    │
│           │ • Verify all   │          │ • Verify tenant │    │
│           │   tables       │          │   tables        │    │
│           └───────┬────────┘          └───────┬────────┘    │
│                   │                           │              │
│                   └───────────┬───────────────┘              │
│                               │                              │
│                               ▼                              │
│          ┌──────────────────────────────┐                    │
│          │  Small file (< 50 MB)        │                    │
│          │  → DB::unprepared() (sync)   │                    │
│          │                              │                    │
│          │  Large file (>= 50 MB)       │                    │
│          │  → Queue job → mysql CLI     │                    │
│          │  → Poll status               │                    │
│          └──────────────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

**Restore Flow:**
1. Superadmin navigates to `/restore`
2. Selects a `.sql` file via drag-and-drop or file picker
3. UI validates file extension and size (client-side pre-check)
4. **Dry-run preview** — upload to `/dry-run` endpoint; backend reads the header, detects mode (full vs tenant), estimates tables/rows, and returns warnings
5. UI shows the detected mode + impact summary + confirmation dialog
6. User confirms — file is uploaded to `POST /api/v1/db/restore` with `onUploadProgress`
7. Backend validates the file (extension, magic bytes, size limit)
8. Backend **detects backup mode** from the SQL header comment
9. Backend creates an automatic backup snapshot of the current DB state (full snapshot for full-DB restore; affected-tables snapshot for per-tenant restore)
10. Backend executes the SQL with the appropriate strategy:
    - **Full DB restore:** disables FK checks, executes all statements, re-enables FK checks
    - **Per-tenant restore:** optionally deletes existing rows for the target `tenant_id` first, then inserts the new data
11. UI polls `GET /api/v1/db/restore/{job_id}/status` for progress
12. On success, backend verifies row counts and returns a summary (including which mode was detected)
13. On failure, backend rolls back from the auto-snapshot and reports the error

---

## 3. Backup Mode Detection (Restore Side)

### 3.1 How Detection Works

The `RestoreService` reads the first 500 bytes of the uploaded `.sql` file and searches for the header comment patterns defined in the [Download plan §2.2](./DOWNLOAD_SQL_DB_BY_TENANT.md#22-sql-header-convention-for-restore-auto-detection):

| Pattern in first 500 bytes | Detected mode | Restore strategy |
|---------------------------|---------------|------------------|
| `UIMS Full Database Backup` | `full` | Replace entire database |
| `UIMS Tenant Export` | `tenant` | Restore tenant-scoped data |
| Neither pattern found | `unknown` | Reject with error: "Unrecognized SQL file format. Only UIMS-generated backups are supported." |

### 3.2 Per-Tenant: Extracting Tenant Metadata

If the mode is `tenant`, the service also parses the header for:
- `Tenant: {name} (ID: {id})` — original tenant ID and name
- `Business Type ID: {id}` — the business type scope

This metadata is shown in the dry-run preview and used to:
- Warn if the tenant ID already exists in the target DB (merge vs replace)
- Allow the superadmin to **remap** the tenant ID (e.g., import tenant 1's data as tenant 3)

### 3.3 Detection in Dry-Run Response

The dry-run endpoint returns the detected mode so the UI can display it before the user commits:

```json
{
  "valid": true,
  "backup_mode": "tenant",
  "detected_tenant_id": 1,
  "detected_tenant_name": "Howlader Electric",
  "target_tenant_exists": true,
  "file_size_bytes": 15728640,
  "estimated_tables": 72,
  "estimated_rows": 15360,
  "contains_create_table": true,
  "contains_inserts": true,
  "contains_drop_table": false,
  "warnings": [
    "Tenant ID 1 already exists in the database — existing data will be replaced"
  ]
}
```

---

## 4. Two Execution Strategies

The restore must handle files ranging from 100 KB (small tenant) to 500+ MB (full DB or large tenant). Two strategies based on file size, independent of backup mode:

### 4.1 Synchronous — Small Files (< 50 MB)

| Aspect | Detail |
|--------|--------|
| **Method** | `DB::unprepared(file_get_contents($path))` |
| **Execution** | Single HTTP request, holds connection open |
| **Timeout** | PHP `set_time_limit(300)` (5 min) |
| **Progress** | Upload progress only (axios `onUploadProgress`); execution is atomic |
| **Response** | Returns summary directly in the POST response |
| **Use case** | Most per-tenant restores; dev/test imports |

### 4.2 Queued — Large Files (>= 50 MB)

| Aspect | Detail |
|--------|--------|
| **Method** | Queue job shells out to `mysql` CLI: `mysql -u {$user} -p{$pass} {$db} < {$file}` |
| **Execution** | Background job via `php artisan queue:work` |
| **Progress** | Job writes progress rows to `db_restore_jobs` table; UI polls status endpoint |
| **Response** | POST returns `{ job_id }` immediately; UI polls status |
| **Use case** | Full DB restores; large production tenants; avoids HTTP timeout |

---

## 5. Safety: Automatic Pre-Restore Backup

Before any SQL is executed, the backend **automatically creates a snapshot** of the current database state so the restore can be rolled back on failure. The snapshot strategy differs by detected mode:

### 5.1 Full DB Restore → Full Snapshot

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Upload .sql │────▶│ Snapshot entire │────▶│ Execute uploaded │
│ (full mode) │     │ DB → .sql file  │     │ .sql file        │
└─────────────┘     │ (mysqldump)     │     └────────┬─────────┘
                    └─────────────────┘              │
                                          ┌──────────┴──────────┐
                                          │                     │
                                     Success                Failure
                                          │                     │
                                          ▼                     ▼
                                   ┌────────────┐    ┌──────────────────┐
                                   │ Verify all │    │ Rollback entire  │
                                   │ tables     │    │ DB from snapshot │
                                   │ Return     │    │ Mark job failed  │
                                   │ summary    │    │ Report error     │
                                   └────────────┘    └──────────────────┘
```

### 5.2 Per-Tenant Restore → Scoped Snapshot

For per-tenant restores, the snapshot only covers the affected tables for that tenant (smaller, faster):

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Upload .sql │────▶│ Snapshot tenant │────▶│ DELETE existing  │
│ (tenant     │     │ tables only     │     │ tenant rows      │
│  mode)      │     │ (WHERE tenant_  │     │ INSERT new rows  │
│             │     │  id = {id})     │     │ from .sql file   │
└─────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                          ┌──────────┴──────────┐
                                          │                     │
                                     Success                Failure
                                          │                     │
                                          ▼                     ▼
                                   ┌────────────┐    ┌──────────────────┐
                                   │ Verify     │    │ Rollback tenant  │
                                   │ tenant     │    │ tables from      │
                                   │ tables     │    │ scoped snapshot  │
                                   │ Return     │    │ Mark job failed  │
                                   │ summary    │    │ Report error     │
                                   └────────────┘    └──────────────────┘
```

**Snapshot details:**
- **Full mode:** `mysqldump --single-transaction -u {$user} -p{$pass} {$db} > storage/app/restore-snapshots/{$timestamp}_full.sql`
- **Tenant mode:** Per-table `SELECT * WHERE tenant_id = {id}` for the 59 tenant tables + shared data, saved to `storage/app/restore-snapshots/{$timestamp}_tenant_{id}.sql`
- Retained for 7 days (configurable), then auto-cleaned
- If snapshot creation fails, the restore is **aborted** — never restore without a rollback path

---

## 6. API Endpoints

### 6.1 Upload & Start Restore

```
POST /api/v1/db/restore
  Content-Type: multipart/form-data
  Body:
    - file: <binary .sql file>
    - mode: "auto" | "full" | "tenant" (optional, default "auto" — auto-detect from header)
    - dry_run: "0" | "1" (optional, default "0")
    - tenant_id: string (optional, for per-tenant remapping — overrides the tenant ID in the file)
    - replace_existing: "0" | "1" (optional, default "1" — if tenant exists, replace their data)

  → 200 (sync, small file):
    {
      "status": "completed",
      "message": "Database restored successfully",
      "detected_mode": "tenant",
      "detected_tenant_id": 1,
      "summary": {
        "tables_affected": 72,
        "rows_inserted": 15360,
        "duration_seconds": 12.5,
        "snapshot_file": "restore-snapshots/2026-07-11_120000_tenant_1.sql"
      }
    }

  → 202 (queued, large file):
    {
      "status": "processing",
      "message": "Restore job started",
      "detected_mode": "full",
      "job_id": 45
    }
```

### 6.2 Poll Restore Status (queued only)

```
GET /api/v1/db/restore/{job_id}/status

  → 200:
    {
      "status": "processing|completed|failed|rolling_back",
      "detected_mode": "full|tenant",
      "progress": "45/81 tables",
      "progress_percent": 55,
      "error": null,
      "summary": null
    }

  → 200 (completed):
    {
      "status": "completed",
      "detected_mode": "tenant",
      "progress": "72/72 tables",
      "progress_percent": 100,
      "error": null,
      "summary": {
        "tables_affected": 72,
        "rows_inserted": 15360,
        "duration_seconds": 145.2,
        "snapshot_file": "restore-snapshots/2026-07-11_120000_tenant_1.sql"
      }
    }

  → 200 (failed):
    {
      "status": "failed",
      "detected_mode": "full",
      "progress": "23/81 tables",
      "progress_percent": 28,
      "error": "SQL syntax error at line 4521: ...",
      "summary": null
    }
```

### 6.3 Dry-Run (Preview without executing)

```
POST /api/v1/db/restore/dry-run
  Content-Type: multipart/form-data
  Body:
    - file: <binary .sql file>
    - tenant_id: string (optional, for remapping check)

  → 200 (per-tenant file detected):
    {
      "valid": true,
      "backup_mode": "tenant",
      "detected_tenant_id": 1,
      "detected_tenant_name": "Howlader Electric",
      "target_tenant_exists": true,
      "file_size_bytes": 15728640,
      "estimated_tables": 72,
      "estimated_rows": 15360,
      "contains_create_table": true,
      "contains_inserts": true,
      "contains_drop_table": false,
      "warnings": [
        "Tenant ID 1 already exists in the database — existing data will be replaced"
      ]
    }

  → 200 (full DB file detected):
    {
      "valid": true,
      "backup_mode": "full",
      "detected_tenant_id": null,
      "detected_tenant_name": null,
      "target_tenant_exists": null,
      "file_size_bytes": 157286400,
      "estimated_tables": 81,
      "estimated_rows": 85000,
      "contains_create_table": true,
      "contains_inserts": true,
      "contains_drop_table": false,
      "warnings": [
        "Full database restore — ALL tenant data will be replaced",
        "Large file (150 MB) — will be processed as a queued job"
      ]
    }

  → 200 (unrecognized file):
    {
      "valid": false,
      "backup_mode": "unknown",
      "warnings": [
        "Unrecognized SQL file format — no UIMS backup header found"
      ]
    }
```

### 6.4 Download Last Snapshot

```
GET /api/v1/db/restore/snapshot/download
  ?mode=full|tenant   (optional, defaults to most recent)
  → 200: application/sql file stream (most recent snapshot)
```

### 6.5 Rollback (manual)

```
POST /api/v1/db/restore/rollback
  Body:
    - snapshot_file: "restore-snapshots/2026-07-11_120000_full.sql"

  → 200:
    { "status": "completed", "message": "Database rolled back to snapshot" }
```

---

## 7. Backend Implementation (Laravel)

### Step 1: Create `RestoreService`

**File:** `app/Services/RestoreService.php`

Methods:
- `detectBackupMode($filePath)` — reads first 500 bytes, matches header patterns, returns `'full'`, `'tenant'`, or `'unknown'`
- `extractTenantMetadata($filePath)` — parses tenant ID, name, business_type_id from the header (tenant mode only)
- `validateSqlFile($filePath)` — checks extension, magic bytes, size limit, scans for dangerous statements
- `createSnapshot($mode, $tenantId = null)` — full `mysqldump` for full mode; scoped `SELECT WHERE tenant_id` for tenant mode
- `executeSync($filePath)` — `DB::unprepared()` for small files
- `executeQueued($filePath, $jobId)` — shells out to `mysql` CLI for large files
- `rollbackFromSnapshot($snapshotPath)` — restores from a snapshot file
- `dryRun($filePath, $targetTenantId = null)` — detects mode, parses SQL to estimate tables/rows, checks if target tenant exists, returns warnings
- `verifyRowCounts($mode, $expectedCounts, $tenantId = null)` — post-restore verification
- `getDangerousPatterns()` — returns regex patterns for `DROP DATABASE`, `TRUNCATE`, `DELETE FROM` without `WHERE`, etc.

### Step 2: Create `db_restore_jobs` Table

**File:** `database/migrations/xxxx_xx_xx_create_db_restore_jobs_table.php`

```php
Schema::create('db_restore_jobs', function (Blueprint $table) {
    $table->id();
    $table->enum('detected_mode', ['full', 'tenant', 'unknown'])->default('unknown');
    $table->unsignedBigInteger('detected_tenant_id')->nullable();
    $table->string('detected_tenant_name')->nullable();
    $table->unsignedBigInteger('target_tenant_id')->nullable(); // for remapping
    $table->string('original_filename');
    $table->string('stored_filename');
    $table->unsignedBigInteger('file_size_bytes');
    $table->string('snapshot_file')->nullable();
    $table->boolean('replace_existing')->default(true);
    $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'rolling_back'])
          ->default('pending');
    $table->unsignedInteger('progress_percent')->default(0);
    $table->string('current_table')->nullable();
    $table->unsignedInteger('tables_done')->default(0);
    $table->unsignedInteger('tables_total')->default(0);
    $table->text('error_message')->nullable();
    $table->json('summary')->nullable();
    $table->foreignId('initiated_by')->constrained('users');
    $table->timestamps();
});
```

### Step 3: Create `RestoreDatabaseJob` (queued)

**File:** `app/Jobs/RestoreDatabaseJob.php`

```php
class RestoreDatabaseJob implements ShouldQueue {
    public function handle(RestoreService $service): void {
        $job = DbRestoreJob::find($this->jobId);
        $job->update(['status' => 'processing']);

        try {
            // 1. Detect mode (already done in controller, but re-confirm)
            $mode = $service->detectBackupMode($this->filePath);
            $job->update(['detected_mode' => $mode]);

            // 2. Create snapshot (strategy depends on mode)
            $snapshot = $service->createSnapshot($mode, $this->targetTenantId);
            $job->update(['snapshot_file' => $snapshot]);

            // 3. For tenant mode with replace_existing: delete old tenant rows
            if ($mode === 'tenant' && $this->replaceExisting) {
                $service->deleteTenantData($this->targetTenantId ?? $job->detected_tenant_id);
            }

            // 4. Execute via mysql CLI
            $service->executeViaMysqlCli($this->filePath, $job);

            // 5. Verify
            $summary = $service->verifyRowCounts($mode, $this->expectedCounts, $this->targetTenantId);
            $job->update(['status' => 'completed', 'summary' => $summary]);
        } catch (\Throwable $e) {
            $job->update(['status' => 'rolling_back']);
            $service->rollbackFromSnapshot($snapshot ?? null);
            $job->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
        } finally {
            @unlink($this->filePath);
        }
    }
}
```

### Step 4: Create `DbRestoreController`

**File:** `app/Http/Controllers/Api/DbRestoreController.php`

- `restore(Request $request)` — handles file upload, validates, detects mode, creates `db_restore_jobs` record, dispatches sync or queued
- `status($jobId)` — returns `db_restore_jobs` row state (includes `detected_mode`)
- `dryRun(Request $request)` — detects mode, parses SQL, checks target tenant existence, returns preview without executing
- `downloadSnapshot(Request $request)` — streams the most recent (or specified) snapshot file
- `rollback(Request $request)` — manual rollback from a named snapshot

### Step 5: Add API Routes

**File:** `routes/api.php`

```php
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::post('db/restore', [DbRestoreController::class, 'restore']);
    Route::post('db/restore/dry-run', [DbRestoreController::class, 'dryRun']);
    Route::get('db/restore/{jobId}/status', [DbRestoreController::class, 'status']);
    Route::get('db/restore/snapshot/download', [DbRestoreController::class, 'downloadSnapshot']);
    Route::post('db/restore/rollback', [DbRestoreController::class, 'rollback']);
});
```

### Step 6: Create Artisan Command

**File:** `app/Console/Commands/DbRestore.php`

```bash
php artisan db:restore {file} {--dry-run} {--force} {--mode=auto} {--tenant-id=}
```

- `{--mode=auto}` — auto-detect from header, or force `full`/`tenant`
- `{--tenant-id=}` — remap tenant ID for per-tenant restores
- Validates the file path exists
- Optionally runs dry-run first
- Without `--force`, prompts for confirmation (shows detected mode, table/row estimates)
- Creates snapshot (scoped by mode), executes, verifies
- Prints summary with detected mode and row counts

---

## 8. Frontend Implementation (Next.js)

### Step 1: Create `restoreService`

**File:** `services/restoreService.ts`

Mirrors the `productImageService.ts` pattern (FormData + `onUploadProgress`):

```typescript
import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export type BackupMode = 'full' | 'tenant' | 'unknown';

export interface RestoreSummary {
  tables_affected: number;
  rows_inserted: number;
  duration_seconds: number;
  snapshot_file: string;
}

export interface RestoreStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolling_back';
  detected_mode: BackupMode;
  progress: string;
  progress_percent: number;
  error: string | null;
  summary: RestoreSummary | null;
}

export interface DryRunResult {
  valid: boolean;
  backup_mode: BackupMode;
  detected_tenant_id: number | null;
  detected_tenant_name: string | null;
  target_tenant_exists: boolean | null;
  file_size_bytes: number;
  estimated_tables: number;
  estimated_rows: number;
  contains_create_table: boolean;
  contains_inserts: boolean;
  contains_drop_table: boolean;
  warnings: string[];
}

class RestoreService {
  /** POST /api/v1/db/restore (multipart) */
  async restoreDatabase(
    file: File,
    options?: {
      mode?: 'auto' | 'full' | 'tenant';
      tenantId?: string;
      replaceExisting?: boolean;
      onUploadProgress?: (progressEvent: any) => void;
    }
  ): Promise<RestoreSummary | { job_id: number; detected_mode: BackupMode }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options?.mode ?? 'auto');
    if (options?.tenantId) formData.append('tenant_id', options.tenantId);
    if (options?.replaceExisting !== undefined) {
      formData.append('replace_existing', options.replaceExisting ? '1' : '0');
    }

    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/db/restore',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: options?.onUploadProgress,
      }
    );
    return response.data.data;
  }

  /** GET /api/v1/db/restore/{jobId}/status */
  async getRestoreStatus(jobId: number): Promise<RestoreStatus> {
    const response = await apiClient.get<ApiResponse<RestoreStatus>>(
      `/api/v1/db/restore/${jobId}/status`
    );
    return response.data.data;
  }

  /** POST /api/v1/db/restore/dry-run (multipart) */
  async dryRun(file: File, tenantId?: string): Promise<DryRunResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (tenantId) formData.append('tenant_id', tenantId);
    const response = await apiClient.post<ApiResponse<DryRunResult>>(
      '/api/v1/db/restore/dry-run',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  }

  /** POST /api/v1/db/restore/rollback */
  async rollback(snapshotFile: string): Promise<void> {
    await apiClient.post('/api/v1/db/restore/rollback', {
      snapshot_file: snapshotFile,
    });
  }
}

export const restoreService = new RestoreService();
export default restoreService;
```

**Register in barrel:** Add to `services/index.ts`:
```typescript
export { restoreService, type RestoreSummary, type RestoreStatus, type DryRunResult, type BackupMode } from './restoreService';
```

### Step 2: Create the Restore Page

**File:** `app/(protected)/restore/page.tsx`

```
'superadmin/restore/'
├── page.tsx                          ← main restore page
├── _components/
│   ├── RestoreUploadForm.tsx         ← drag-and-drop + file picker + progress bar
│   ├── RestoreProgressDialog.tsx     ← modal showing queued-job polling progress
│   ├── DryRunReport.tsx              ← shows dry-run preview with detected mode
│   ├── TenantRemapOption.tsx         ← per-tenant: remap tenant ID / replace toggle
│   └── RestoreHistoryTable.tsx       ← recent restore jobs list
└── constants.ts                      ← max file size, accepted extensions
```

### Step 3: `RestoreUploadForm` Component

**File:** `app/(protected)/restore/_components/RestoreUploadForm.tsx`

This is the core UI component. It mirrors the `ImageUploadForm.tsx` pattern (drag-and-drop, hidden file input, progress bar) and adds the destructive-action confirmation via SweetAlert2.

**Key behaviors:**

1. **File selection** — drag-and-drop zone or click-to-browse (hidden `<input type="file" accept=".sql">`)
2. **Client-side validation** — check `.sql` extension, check file size against `MAX_FILE_SIZE` constant
3. **Dry-run preview** — before executing, upload to `/dry-run` endpoint; backend auto-detects the backup mode and returns estimated tables/rows, detected tenant info, and warnings
4. **Show detected mode** — the dry-run report displays whether the file was detected as a **Full Database Backup** or **Per-Tenant Backup**, with different confirmation warnings:
   - **Full DB:** "This will replace the ENTIRE database — all tenants, all tables. Are you absolutely sure?"
   - **Per-Tenant:** "This will replace tenant 'Howlader Electric' (ID: 1) data. A snapshot will be created for rollback."
5. **Per-tenant options** — if tenant mode is detected, show:
   - Detected tenant name + ID
   - If target tenant exists: "Replace existing data" toggle (default ON)
   - Optional "Remap to different tenant ID" field
6. **Confirmation** — `confirm()` dialog from `@/lib/notifications` with mode-appropriate warning text
7. **Upload** — `restoreService.restoreDatabase(file, { onUploadProgress })` with live progress bar
8. **Queued polling** — if response contains `job_id`, show `RestoreProgressDialog` and poll status every 2 seconds
9. **Success** — `notify.success()` with summary (includes detected mode); offer "Download snapshot" link
10. **Failure** — `notify.error()` with error message; offer "Rollback" button

**UI sketch:**

```
┌───────────────────────────────────────────────────────┐
│  🔄 Restore Database from SQL File                    │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │                 ┌──────────┐                    │  │
│  │                 │  📁 .sql  │                    │  │
│  │                 │  upload   │                    │  │
│  │                 └──────────┘                    │  │
│  │   Drag & drop your .sql file here                │  │
│  │   or click to browse                              │  │
│  │   Max size: 500 MB · Accepted: .sql              │  │
│  │   Mode is auto-detected from file header          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Selected: howlader_electric_2026-07-10.sql (15 MB)  │
│                                                       │
│  [Dry Run Preview]  [Restore]         [Clear]        │
│                                                       │
│  ┌─ Upload Progress ──────────────────────────────┐  │
│  │  ████████████████████░░░░░░░░  68%  Uploading  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Step 4: `DryRunReport` Component (with mode detection display)

**File:** `app/(protected)/restore/_components/DryRunReport.tsx`

Shows the result of the dry-run preview, prominently displaying the **detected backup mode**:

**Per-tenant file detected:**
```
┌───────────────────────────────────────────────────────┐
│  🔍 Dry Run Preview                                  │
├───────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │  📦 Detected: PER-TENANT BACKUP                 │  │
│  │  Tenant: Howlader Electric (ID: 1)              │  │
│  │  Business Type: Electric & Electronics           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  File:      howlader_electric_2026-07-10.sql          │
│  Size:      15 MB                                    │
│  Tables:    72 (estimated)                            │
│  Rows:      15,360 (estimated)                        │
│                                                       │
│  ⚠️ Tenant ID 1 already exists — data will be        │
│     replaced. A snapshot will be created first.       │
│                                                       │
│  [✓] Replace existing tenant data                    │
│  [ ] Remap to different tenant ID: [____]            │
│                                                       │
│  Contains:  [✓] CREATE TABLE  [✓] INSERT             │
│             [✗] DROP TABLE    [✗] TRUNCATE            │
│                                                       │
│  [Proceed with Restore]  [Cancel]                    │
└───────────────────────────────────────────────────────┘
```

**Full DB file detected:**
```
┌───────────────────────────────────────────────────────┐
│  🔍 Dry Run Preview                                  │
├───────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │  🗄️  Detected: FULL DATABASE BACKUP             │  │
│  │  ALL tenants, ALL tables will be replaced        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  File:      inventory_full_2026-07-10.sql             │
│  Size:      150 MB                                   │
│  Tables:    81 (estimated)                            │
│  Rows:      85,000 (estimated)                        │
│  Tenants:   5                                         │
│                                                       │
│  ⚠️ WARNING: This will replace the ENTIRE database.  │
│     All tenants, all data will be overwritten.        │
│     A full snapshot will be created for rollback.     │
│                                                       │
│  Contains:  [✓] CREATE TABLE  [✓] INSERT             │
│             [✗] DROP TABLE    [✗] TRUNCATE            │
│                                                       │
│  [⚠️ Proceed with FULL Restore]  [Cancel]           │
└───────────────────────────────────────────────────────┘
```

**Unrecognized file:**
```
┌───────────────────────────────────────────────────────┐
│  🔍 Dry Run Preview                                  │
├───────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │  ❌ Unrecognized SQL file format                 │  │
│  │  No UIMS backup header found in file             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Only UIMS-generated backups (.sql files with the     │
│  UIMS header comment) are supported for restore.      │
│                                                       │
│  [Close]                                             │
└───────────────────────────────────────────────────────┘
```

### Step 5: `RestoreProgressDialog` Component

**File:** `app/(protected)/restore/_components/RestoreProgressDialog.tsx`

Shown only for large files that are processed via the queue. Polls `restoreService.getRestoreStatus(jobId)` every 2 seconds using `setInterval` inside a `useEffect` (with cleanup on unmount or when status is terminal). Displays the detected mode badge.

```
┌───────────────────────────────────────────────────────┐
│  ⏳ Restoring Database...                             │
├───────────────────────────────────────────────────────┤
│  Mode: [📦 Per-Tenant: Howlader Electric (ID: 1)]    │
│                                                       │
│  ████████████████░░░░░░░░░░░░░  45/72 tables  62%   │
│                                                       │
│  Current table: purchase_order_items                  │
│  Status: processing                                   │
│                                                       │
│  ⚠️ Do not close this window or navigate away.       │
│  A snapshot was created for rollback if needed.       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Polling implementation** (introduces the first polling pattern in this codebase):

```typescript
useEffect(() => {
  if (!jobId) return;
  const interval = setInterval(async () => {
    const status = await restoreService.getRestoreStatus(jobId);
    setStatus(status);
    if (status.status === 'completed' || status.status === 'failed') {
      clearInterval(interval);
      onComplete(status);
    }
  }, 2000);
  return () => clearInterval(interval);
}, [jobId]);
```

### Step 6: `TenantRemapOption` Component

**File:** `app/(protected)/restore/_components/TenantRemapOption.tsx`

Shown only when the dry-run detects a per-tenant backup and the target tenant already exists in the database. Allows the superadmin to:
- Toggle "Replace existing tenant data" (default ON — deletes old rows, inserts new)
- Enter a different `tenant_id` to import the data as a new tenant (remapping)

### Step 7: `RestoreHistoryTable` Component

**File:** `app/(protected)/restore/_components/RestoreHistoryTable.tsx`

Lists recent restore jobs from `db_restore_jobs` table so the superadmin can see past operations and rollback if needed. Now includes the detected mode column:

```
┌──────────────┬──────────────┬──────────┬───────────┬──────────┬────────────────┐
│ Date         │ Mode         │ Tenant   │ Status   │ Rows     │ Actions        │
├──────────────┼──────────────┼──────────┼───────────┼──────────┼────────────────┤
│ Jul 11 12:00 │ 📦 Tenant    │ Howlader │ ✓ Done   │ 15,360   │ [Snapshot][↩] │
│ Jul 10 18:30 │ 🗄️  Full     │ (all)    │ ✗ Failed │ —        │ [Error][↩]    │
│ Jul 09 09:15 │ 📦 Tenant    │ Alif     │ ✓ Done   │ 850      │ [Snapshot][↩] │
└──────────────┴──────────────┴──────────┴───────────┴──────────┴────────────────┘
```

### Step 8: Constants & Validation

**File:** `app/(protected)/restore/constants.ts`

```typescript
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
export const ACCEPTED_EXTENSIONS = ['.sql'];
export const ACCEPTED_MIME_TYPES = ['application/sql', 'text/plain', 'application/octet-stream'];
export const SYNC_THRESHOLD = 50 * 1024 * 1024; // 50 MB — below = sync, above = queued
export const POLL_INTERVAL_MS = 2000;

// Header patterns for client-side mode pre-detection (matches backend)
export const FULL_DB_HEADER_PATTERN = 'UIMS Full Database Backup';
export const TENANT_HEADER_PATTERN = 'UIMS Tenant Export';
```

### Step 9: Permission Gate

The restore page must be gated to `super-admin` only, mirroring `tenants/page.tsx`:

```typescript
'use client';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RestorePage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) router.push('/access-denied');
  }, [isSuperAdmin, isHydrated, router]);

  if (!isHydrated) return <LoadingSpinner />;
  if (!isSuperAdmin) return null;

  return <RestoreUploadForm />;
}
```

### Step 10: Add Navigation Link

Add a "Restore Database" link to the superadmin navigation menu/sidebar pointing to `/restore`.

---

## 9. Handling Edge Cases

| Case | Solution |
|------|----------|
| File is not valid SQL (corrupt/binary) | Validate magic bytes; dry-run parses first N statements; reject early with clear error |
| No UIMS header found (non-UIMS SQL file) | Dry-run returns `backup_mode: "unknown"`; UI shows "Unrecognized format" and blocks restore |
| SQL contains `DROP DATABASE` | Scan for dangerous patterns in `RestoreService::validateSqlFile()`; reject by default, allow only with `--force` flag on CLI |
| Full DB restore into a DB with different schema | Dry-run compares table count; warns if mismatch; snapshot ensures rollback |
| Per-tenant restore with tenant ID that doesn't exist | Dry-run shows `target_tenant_exists: false`; proceeds as a fresh insert (no DELETE needed) |
| Per-tenant restore with tenant ID that exists | Dry-run shows `target_tenant_exists: true` + warning; `replace_existing` toggle controls whether old data is deleted first |
| Tenant ID remapping conflict | If remapped tenant ID already exists and `replace_existing` is OFF, reject with "Tenant ID {X} already exists — enable replace or choose a different ID" |
| FK constraint errors during import | SQL files use `SET FOREIGN_KEY_CHECKS = 0/1` wrappers (from the export plan); also wrap execution in a transaction where possible |
| Partial failure (some tables imported, then error) | Rollback from the auto-snapshot; mark job as `failed` with error details |
| Duplicate primary keys (full DB restore into non-empty DB) | Full DB restore drops/replaces all tables; `INSERT IGNORE` or `REPLACE INTO` used as fallback |
| Duplicate primary keys (per-tenant restore, replace mode) | Old tenant rows deleted first; no duplicate risk |
| HTTP timeout on large sync restore | Auto-detect: files >= 50 MB go to the queue; small files use `set_time_limit(300)` |
| User closes browser during queued restore | Job continues in the background; status is persisted in `db_restore_jobs`; user can check `RestoreHistoryTable` on next visit |
| Snapshot creation fails (disk full) | Abort the restore entirely; never execute without a rollback path |
| Concurrent restore attempts | Lock: only one restore job can be `processing` at a time; reject additional requests with 409 Conflict |
| Character encoding mismatch | Detect file encoding; convert to UTF-8 if needed before execution; set `SET NAMES utf8mb4` at the top of the import |
| `mysql` CLI not found on server | Fallback to `DB::unprepared()` with chunked statement splitting; log a warning that CLI mode is unavailable |
| Mode header says "tenant" but file contains all-tenant data | Validate: if tenant mode detected but INSERT rows have multiple `tenant_id` values, warn "File appears to contain multi-tenant data but is labeled as per-tenant" |

---

## 10. Security Considerations

- **Authentication:** All restore endpoints require `auth:sanctum` middleware
- **Authorization:** Inline super-admin check inside the controller method — there is no `role:super-admin` middleware alias in this project; only superadmins can restore
- **File validation:** Server-side validation of extension, MIME type, magic bytes, and size — never trust client-side checks alone
- **Header validation:** The `detectBackupMode()` method re-validates the header server-side even if the client pre-detected it — never trust client-side mode detection
- **Dangerous statement scanning:** `RestoreService` scans the SQL for `DROP DATABASE`, `TRUNCATE` without scope, `DELETE FROM` without `WHERE`, `GRANT`, `CREATE USER`, shell escape sequences — blocks or warns
- **Full DB restore extra caution:** Requires an additional confirmation step (double-confirm in UI); the warning text explicitly states "ALL tenants, ALL tables will be replaced"
- **Auto-snapshot:** Mandatory pre-restore backup — the restore **will not proceed** if the snapshot fails
- **Rate limiting:** Max 1 restore every 5 minutes per server (concurrent lock + time-based throttle)
- **File storage:** Uploaded `.sql` files stored in `storage/app/restore-tmp/` (not public); deleted after successful execution or after 24 hours
- **Audit log:** Every restore operation is logged in `db_restore_jobs` with `detected_mode`, `detected_tenant_id`, `initiated_by`, `original_filename`, `file_size`, `status`, `timestamp`, and `summary`
- **CSRF protection:** Already handled by the Sanctum cookie-based auth in `lib/api/axios.ts` (auto-fetches CSRF cookie on POST)
- **Rollback capability:** Manual rollback endpoint + automatic rollback on failure; snapshot files retained for 7 days
- **Dry-run mode:** Users can preview the file's detected mode, contents, and estimated impact before committing to a destructive restore
- **Tenant remapping safety:** If remapping a tenant ID, the system checks for conflicts and requires explicit `replace_existing` confirmation

---

## 11. Effort Estimate

| Step | Description | Duration |
|------|-------------|----------|
| 1 | `RestoreService` — validation, mode detection, snapshot (both modes), execution, rollback, dry-run | 3.5 days |
| 2 | `db_restore_jobs` migration + model (with mode/tenant columns) | 0.5 days |
| 3 | `RestoreDatabaseJob` (queued execution, mode-aware snapshot + delete logic) | 2 days |
| 4 | `DbRestoreController` + API routes | 1 day |
| 5 | `DbRestore` Artisan command | 0.5 days |
| 6 | `restoreService.ts` (frontend service with mode types) | 0.5 days |
| 7 | `RestoreUploadForm` (drag-drop, progress, mode-aware confirmation) | 2 days |
| 8 | `DryRunReport` (mode detection display + per-tenant remap options) | 1.5 days |
| 9 | `RestoreProgressDialog` (polling + mode badge) | 1 day |
| 10 | `TenantRemapOption` + `RestoreHistoryTable` | 1.5 days |
| 11 | Navigation link + permission gate | 0.5 days |
| 12 | Testing (both modes, remapping, failure scenarios, rollback) | 3 days |
| 13 | Documentation | 0.5 days |
| **Total** | | **18 days (3.5 weeks)** |

---

## 12. Out of Scope

This plan does NOT cover:
- Restoring into a **different** database server (cross-host restore) — only the configured DB connection
- Selective table restore (restore only specific tables from the `.sql` file) — the full file is executed
- Real-time streaming SQL execution progress for sync mode (only upload progress is shown for small files)
- Tenant self-service restore (only superadmin)
- Automatic scheduled restores (only on-demand)
- Restore from non-UIMS SQL dumps (MySQL Workbench exports, phpMyAdmin exports) — files without a UIMS header are rejected by the mode detection; a future `--force-raw` CLI flag could bypass this for advanced use
- Cross-tenant data merging (importing tenant 1's data while preserving tenant 2's data in shared tables like `products`) — per-tenant restore replaces the entire scoped dataset for that `business_type_id`

---

## 13. Relationship to the Download Plan

| Aspect | Download (backup) | Restore (import) |
|--------|-------------------|-------------------|
| Direction | DB → `.sql` file | `.sql` file → DB |
| Mode selection | Superadmin picks Full DB or Per-Tenant in UI | Auto-detected from SQL file header |
| Full DB command | `php artisan db:backup` | `php artisan db:restore {file}` |
| Per-tenant command | `php artisan tenant:export {id}` | `php artisan db:restore {file} --mode=tenant` |
| Full DB API | `POST /api/v1/db/backup` | `POST /api/v1/db/restore` (auto-detects) |
| Per-tenant API | `POST /api/v1/tenants/{id}/export` | `POST /api/v1/db/restore` (auto-detects) |
| UI page | `/backup` (mode selector + content) | `/restore` (single upload, mode auto-detected) |
| File transfer | Server → browser (download stream) | Browser → server (multipart upload) |
| Progress | Backup job polling | Upload progress + restore job polling |
| Safety | Read-only (no risk to data) | Auto-snapshot + rollback (destructive); extra confirmation for full DB |
| Service class | `ExportService.php` | `RestoreService.php` |
| Frontend service | `backupService.ts` | `restoreService.ts` |
| Job table | `backup_jobs` | `db_restore_jobs` |
| SQL header | `UIMS Full Database Backup` / `UIMS Tenant Export` | Reads header to auto-detect mode |

The two features are **symmetric** and share the same `.sql` file format with embedded mode headers, superadmin permission gate, and Laravel Sanctum auth infrastructure.
