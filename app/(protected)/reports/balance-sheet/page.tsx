'use client';

import { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Landmark,
  Scale,
} from 'lucide-react';
import { notify } from '@/lib/notifications';
import accountService from '@/services/accountService';
import CustomDatePicker from '@/components/ui/date-picker';
import type { BalanceSheetLine, BalanceSheetReport } from '@/types/accounting.types';
import TenantSelect from '@/components/ui/tenant-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBDT(n: number): string {
  return `৳${Number(n ?? 0).toFixed(2)}`;
}

function BalanceLineRow({ line, indent }: { line: BalanceSheetLine; indent?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${indent ? 'pl-6' : ''}`}>
      <span className="text-gray-700 dark:text-gray-300">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">{line.code}</span>
        {line.name}
      </span>
      <span className={`font-mono text-sm ${line.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
        {formatBDT(line.balance)}
      </span>
    </div>
  );
}

function SubtotalRow({ label, amount, color }: { label: string; amount: number; color?: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm font-semibold">
      <span className={color ?? 'text-gray-700 dark:text-gray-300'}>{label}</span>
      <span className={`font-mono text-sm ${color ?? 'text-gray-900 dark:text-white'}`}>
        {formatBDT(amount)}
      </span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BalanceSheetPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const canExport = hasPermission('export-reports');

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const params: { as_of_date: string; tenant_id?: string } = { as_of_date: asOfDate };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await accountService.balanceSheet(params);
      setReport(res);
      if (res.balanced) {
        notify.success('Balance Sheet loaded. Books are balanced.');
      } else {
        notify.error(
          `Balance Sheet loaded but books are NOT balanced. Variance: ${formatBDT(
            Math.abs(res.total_assets - res.total_le),
          )}.`,
        );
      }
    } catch {
      notify.error('Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = ['Section', 'Code', 'Account', 'Balance'];
    const sectionLines = (section: string, lines: BalanceSheetLine[]) =>
      lines.map((l) => [section, l.code, `"${l.name.replace(/"/g, '""')}"`, l.balance.toFixed(2)]);
    const rows: (string | number)[][] = [
      headers as (string | number)[],
      ...sectionLines('Current Assets', report.assets.lines),
      ...sectionLines('Fixed Assets', report.assets.lines.filter((l) => l.code.startsWith('12'))),
      ...sectionLines('Current Liabilities', report.liabilities.lines.filter(
        (l) => !l.code.startsWith('25') && !l.code.startsWith('26'),
      )),
      ...sectionLines('Long-Term Liabilities', report.liabilities.lines.filter(
        (l) => l.code.startsWith('25') || l.code.startsWith('26'),
      )),
      ...sectionLines('Equity', report.equity.lines),
      [],
      ['TOTAL ASSETS', '', '', report.total_assets.toFixed(2)],
      ['TOTAL LIABILITIES', '', '', report.total_liabilities.toFixed(2)],
      ['TOTAL EQUITY', '', '', report.total_equity.toFixed(2)],
      ['LIABILITIES + EQUITY', '', '', report.total_le.toFixed(2)],
      ['BALANCED', '', '', report.balanced ? 'YES' : 'NO'],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Balance_Sheet_${asOfDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('CSV exported.');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Balance Sheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Snapshot of Assets, Liabilities, and Equity as of a given date
          </p>
        </div>
        {canExport && report && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-4 flex flex-wrap gap-3 items-end">
        {isSuperAdmin && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant</label>
            <TenantSelect
              value={selectedTenantId}
              onChange={(tid) => setSelectedTenantId(tid || '')}
              placeholder="All Tenants"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">As of Date</label>
          <CustomDatePicker
            value={asOfDate}
            onChange={setAsOfDate}
            className="w-full"
            maxDate={new Date()}
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-60"
        >
          <Search size={14} />
          {loading ? 'Loading…' : 'Generate Report'}
        </button>
      </div>

      {report && (
        <div className="space-y-4">
          {/* Balance banner */}
          <div
            className={`rounded-lg border p-3 flex items-center gap-2 ${
              report.balanced
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            {report.balanced ? (
              <>
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-700 dark:text-green-300">Books are balanced</div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Assets equal Liabilities + Equity as of {asOfDate}.
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                <div>
                  <div className="text-sm font-semibold text-red-700 dark:text-red-300">Books are NOT balanced</div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Variance: {formatBDT(Math.abs(report.total_assets - report.total_le))}. Review recent journal
                    entries or run <code className="font-mono">php artisan accounting:detect-drift</code>.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Landmark size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Assets</span>
              </div>
              <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatBDT(report.total_assets)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current: {formatBDT(report.assets.current)} · Fixed: {formatBDT(report.assets.fixed)}
              </p>
            </div>
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-red-700 dark:text-red-300">Total Liabilities</span>
              </div>
              <p className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
                {formatBDT(report.total_liabilities)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current: {formatBDT(report.liabilities.current)} · Long-term: {formatBDT(report.liabilities.long_term)}
              </p>
            </div>
            <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Total Equity</span>
              </div>
              <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatBDT(report.total_equity)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Liabilities + Equity: {formatBDT(report.total_le)}
              </p>
            </div>
          </div>

          {/* Two-column report */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Assets */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Assets
                  </h2>
                  <span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                    {formatBDT(report.total_assets)}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Current Assets */}
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Current Assets
                  </p>
                  {report.assets.lines
                    .filter((l) => l.code.startsWith('11'))
                    .map((l) => (
                      <BalanceLineRow key={l.code} line={l} indent />
                    ))}
                  <SubtotalRow label="Total Current Assets" amount={report.assets.current} />
                </div>
                {/* Fixed Assets */}
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Fixed Assets
                  </p>
                  {report.assets.lines
                    .filter((l) => l.code.startsWith('12'))
                    .map((l) => (
                      <BalanceLineRow key={l.code} line={l} indent />
                    ))}
                  <SubtotalRow label="Total Fixed Assets" amount={report.assets.fixed} />
                </div>
                <div className="pt-2 flex justify-between font-bold">
                  <span className="text-blue-700 dark:text-blue-300">TOTAL ASSETS</span>
                  <span className="font-mono text-blue-700 dark:text-blue-300">
                    {formatBDT(report.total_assets)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Liabilities & Equity */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">
                    Liabilities &amp; Equity
                  </h2>
                  <span className="text-sm font-mono font-semibold text-red-700 dark:text-red-300">
                    {formatBDT(report.total_le)}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Current Liabilities */}
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Current Liabilities
                  </p>
                  {report.liabilities.lines
                    .filter((l) => l.code.startsWith('21'))
                    .map((l) => (
                      <BalanceLineRow key={l.code} line={l} indent />
                    ))}
                  <SubtotalRow label="Total Current Liabilities" amount={report.liabilities.current} />
                </div>
                {/* Long-Term Liabilities */}
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Long-Term Liabilities
                  </p>
                  {report.liabilities.lines
                    .filter((l) => l.code.startsWith('25') || l.code.startsWith('26'))
                    .map((l) => (
                      <BalanceLineRow key={l.code} line={l} indent />
                    ))}
                  <SubtotalRow
                    label="Total Long-Term Liabilities"
                    amount={report.liabilities.long_term}
                  />
                </div>
                <SubtotalRow label="Total Liabilities" amount={report.total_liabilities} color="text-red-700 dark:text-red-300" />

                {/* Equity */}
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Equity
                  </p>
                  {report.equity.lines.map((l) => (
                    <BalanceLineRow key={l.code} line={l} indent />
                  ))}
                  <SubtotalRow label="Total Equity" amount={report.total_equity} />
                </div>

                <div className="pt-2 flex justify-between font-bold">
                  <span className="text-red-700 dark:text-red-300">LIABILITIES + EQUITY</span>
                  <span className="font-mono text-red-700 dark:text-red-300">{formatBDT(report.total_le)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equation check */}
          <div className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-gray-700 dark:text-gray-200" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">Accounting Equation</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono font-semibold">
                <span className="text-blue-600 dark:text-blue-400">{formatBDT(report.total_assets)}</span>
                <span className="text-gray-500">=</span>
                <span className="text-red-600 dark:text-red-400">{formatBDT(report.total_le)}</span>
                <span
                  className={
                    report.balanced
                      ? 'text-green-600 dark:text-green-400 flex items-center gap-1'
                      : 'text-red-600 dark:text-red-400 flex items-center gap-1'
                  }
                >
                  {report.balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {report.balanced ? 'Balanced' : `Diff ${formatBDT(Math.abs(report.total_assets - report.total_le))}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
          <Landmark className="mx-auto h-10 w-10 text-gray-400" />
          <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No balance sheet generated</div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pick an as-of date and click <strong>Generate Report</strong> to view Assets, Liabilities, and Equity.
          </p>
        </div>
      )}
    </div>
  );
}
