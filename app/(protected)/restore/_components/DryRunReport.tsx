'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Database, Building2, FileText } from 'lucide-react';
import type { DryRunResult, RestoreStrategy } from '@/services/restoreService';
import { FORMATTING, MODE_LABELS } from '../constants';

interface DryRunReportProps {
  result: DryRunResult;
  strategy: RestoreStrategy;
  onStrategyChange: (val: RestoreStrategy) => void;
  targetTenantId: string;
  onTargetTenantIdChange: (val: string) => void;
  businessTypes: { id: string; name: string }[];
  businessTypeId: string;
  onBusinessTypeIdChange: (val: string) => void;
}

export function DryRunReport({
  result,
  strategy,
  onStrategyChange,
  targetTenantId,
  onTargetTenantIdChange,
  businessTypes,
  businessTypeId,
  onBusinessTypeIdChange,
}: DryRunReportProps) {
  const modeStyle = MODE_LABELS[result.mode] ?? MODE_LABELS.unknown;
  const isFresh = strategy === 'fresh';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-start gap-3">
        {result.valid && result.mode !== 'unknown' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Dry Run Preview</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No changes have been made. Review the detected mode and impact before proceeding.
          </p>
        </div>
      </div>

      {/* Mode banner */}
      <div className={`p-3 rounded-md border ${
        result.mode === 'full' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
          : result.mode === 'tenant' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700'
      }`}>
        <div className="flex items-center gap-2">
          {result.mode === 'full' ? <Database className="w-4 h-4 text-indigo-600" /> :
            result.mode === 'tenant' ? <Building2 className="w-4 h-4 text-emerald-600" /> :
            <FileText className="w-4 h-4 text-gray-500" />}
          <span className={`text-sm font-semibold ${modeStyle.color} px-2 py-0.5 rounded`}>
            Detected: {modeStyle.label}
          </span>
        </div>
        {result.mode === 'tenant' && result.detected_tenant_name && (
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
            Tenant: <b>{result.detected_tenant_name}</b> (ID: {result.detected_tenant_id})
          </p>
        )}
        {result.mode === 'full' && (
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
            {isFresh
              ? 'Fresh: ALL tenants, ALL tables will be replaced by this backup.'
              : 'Merge: existing data is kept — only rows that do not already exist will be inserted.'}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[10px] uppercase text-gray-500">File Size</div>
          <div className="text-sm font-semibold">{FORMATTING.humanFileSize(result.file_size_bytes)}</div>
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[10px] uppercase text-gray-500">Tables (est.)</div>
          <div className="text-sm font-semibold">{result.estimated_tables}</div>
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[10px] uppercase text-gray-500">Rows (est.)</div>
          <div className="text-sm font-semibold">{result.estimated_rows.toLocaleString()}</div>
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/30">
          <div className="text-[10px] uppercase text-gray-500">Tenant Exists</div>
          <div className="text-sm font-semibold">
            {result.target_tenant_exists === null ? '—' : result.target_tenant_exists ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* Contains flags */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Tag ok={result.contains_create_table} label="CREATE TABLE" />
        <Tag ok={result.contains_inserts} label="INSERT" />
        <Tag ok={result.contains_drop_table} label="DROP TABLE" />
      </div>

      {/* Restore strategy */}
      <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Restore strategy</p>

        <label className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer ${
          strategy === 'merge'
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <input
            type="radio"
            name="restore-strategy"
            checked={strategy === 'merge'}
            onChange={() => onStrategyChange('merge')}
            className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            <b>Merge</b> — keep existing data and insert only new rows.
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Duplicate rows (same primary key) are skipped; nothing is deleted or overwritten.
            </span>
          </span>
        </label>

        <label className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer ${
          strategy === 'fresh'
            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <input
            type="radio"
            name="restore-strategy"
            checked={strategy === 'fresh'}
            onChange={() => onStrategyChange('fresh')}
            className="mt-0.5 w-4 h-4 text-red-600 border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            <b>Fresh</b> — {result.mode === 'tenant' ? 'replace this tenant' : 'truncate the database'} then import.
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {result.mode === 'tenant'
                ? "Existing rows for the tenant are deleted first, then the backup is inserted."
                : 'Existing rows are wiped first, then the backup is loaded. This cannot be undone except from the snapshot.'}
            </span>
          </span>
        </label>
      </div>

      {/* Business type handling */}
      <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          Business Type
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The uploaded <code>business_types</code> table is skipped — your current business
          types are kept, and all imported data is re-pointed to the selected type.
          {result.detected_business_type_ids && result.detected_business_type_ids.length > 0 && (
            <>
              {' '}Backup references{' '}
              <span className="font-mono">{result.detected_business_type_ids.join(', ')}</span>.
            </>
          )}
        </p>
        <select
          value={businessTypeId}
          onChange={(e) => onBusinessTypeIdChange(e.target.value)}
          className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Don&apos;t remap — use the backup&apos;s business type as-is</option>
          {businessTypes.map((bt) => (
            <option key={String(bt.id)} value={String(bt.id)}>
              {bt.name}
            </option>
          ))}
        </select>
        {businessTypes.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No business types found in the current database.
          </p>
        )}
      </div>

      {/* Per-tenant options */}
      {result.mode === 'tenant' && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-700 dark:text-gray-200 whitespace-nowrap">Remap to tenant ID:</label>
            <input
              type="text"
              value={targetTenantId}
              onChange={(e) => onTargetTenantIdChange(e.target.value)}
              placeholder={`default: ${result.detected_tenant_id ?? '—'}`}
              className="flex-1 max-w-[180px] px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-xs text-gray-500">leave blank to use the file's tenant ID</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-300 pl-5">• {w}</p>
          ))}
        </div>
      )}

      {/* Errors */}
      {result.errors && result.errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Errors
          </p>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-700 dark:text-red-300 pl-5">• {e}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
        ok
          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
          : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-400'
      }`}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}
