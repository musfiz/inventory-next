'use client';

import { useMemo, useState } from 'react';
import { Search, Scale, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { notify } from '@/lib/notifications';
import accountService from '@/services/accountService';
import CustomDatePicker from '@/components/ui/date-picker';
import type { AccountType, TrialBalanceReport, TrialBalanceRow } from '@/types/accounting.types';
import { usePermissions } from '@/hooks/use-permissions';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense', 'contra'];

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-600 dark:text-blue-400',
  liability: 'text-red-600 dark:text-red-400',
  equity: 'text-purple-600 dark:text-purple-400',
  revenue: 'text-green-600 dark:text-green-400',
  expense: 'text-orange-600 dark:text-orange-400',
  contra: 'text-gray-600 dark:text-gray-400',
};

const TYPE_BG: Record<string, string> = {
  asset: 'bg-blue-50 dark:bg-blue-900/20',
  liability: 'bg-red-50 dark:bg-red-900/20',
  equity: 'bg-purple-50 dark:bg-purple-900/20',
  revenue: 'bg-green-50 dark:bg-green-900/20',
  expense: 'bg-orange-50 dark:bg-orange-900/20',
  contra: 'bg-gray-50 dark:bg-gray-800/40',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBDT(n: number): string {
  return `৳${Number(n ?? 0).toFixed(2)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrialBalancePage() {
  const { hasPermission } = usePermissions();
  const canExport = hasPermission('export-reports');

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (startDate > endDate) {
      notify.error('Start date cannot be after end date.');
      return;
    }
    setLoading(true);
    try {
      const res = await accountService.trialBalance({ start_date: startDate, end_date: endDate });
      setReport(res);
      if (res.is_balanced) {
        notify.success('Trial balance loaded. Books are balanced.');
      } else {
        notify.error('Trial balance loaded. Books are NOT balanced — review recent entries.');
      }
    } catch {
      notify.error('Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  // Group rows by account type for the sectioned view
  const grouped = useMemo(() => {
    if (!report) return {} as Record<AccountType, TrialBalanceRow[]>;
    if (!report.data) return {} as Record<AccountType, TrialBalanceRow[]>;
    const filtered = report.data.filter(
      (r) =>
        !search ||
        r.code.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase()),
    );
    return ACCOUNT_TYPES.reduce((acc, t) => {
      acc[t] = filtered.filter((r) => r.account_type === t);
      return acc;
    }, {} as Record<AccountType, TrialBalanceRow[]>);
  }, [report, search]);

  // Subtotal per type
  const typeSubtotal = (rows: TrialBalanceRow[]) =>
    rows.reduce(
      (s, r) => ({ debit: s.debit + r.total_debit, credit: s.credit + r.total_credit }),
      { debit: 0, credit: 0 },
    );

  const exportCsv = () => {
    if (!report) return;
    const headers = ['Code', 'Account', 'Type', 'Debit', 'Credit', 'Balance'];
    const lines = report.data.map((r) => [
      r.code,
      `"${r.name.replace(/"/g, '""')}"`,
      r.account_type,
      r.total_debit.toFixed(2),
      r.total_credit.toFixed(2),
      r.balance.toFixed(2),
    ]);
    const csv = [headers, ...lines, [], [
      '',
      'TOTALS',
      '',
      report.total_debit.toFixed(2),
      report.total_credit.toFixed(2),
      (report.total_debit - report.total_credit).toFixed(2),
    ]]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Trial_Balance_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('CSV exported.');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trial Balance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verifies that total debits equal total credits across all posted entries
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
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <CustomDatePicker
            value={startDate}
            onChange={setStartDate}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
          <CustomDatePicker
            value={endDate}
            onChange={setEndDate}
            className="w-full"
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
        {report && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Filter by code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 pl-9"
            />
          </div>
        )}
      </div>

      {/* Report body */}
      {report && (
        <div className="space-y-4">
          {/* Balance banner */}
          <div
            className={`rounded-lg border p-3 flex items-center gap-2 ${
              report.is_balanced
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            {report.is_balanced ? (
              <>
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-700 dark:text-green-300">Books are balanced</div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Total debits equal total credits for the period.
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                <div>
                  <div className="text-sm font-semibold text-red-700 dark:text-red-300">Books are NOT balanced</div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Variance: {formatBDT(Math.abs(report.total_debit - report.total_credit))}. Review recent journal
                    entries or run <code className="font-mono">php artisan accounting:detect-drift</code>.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Debit</div>
              <div className="mt-1 text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatBDT(report.total_debit)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Credit</div>
              <div className="mt-1 text-xl font-bold font-mono text-red-600 dark:text-red-400">
                {formatBDT(report.total_credit)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Difference</div>
              <div
                className={`mt-1 text-xl font-bold font-mono ${
                  report.is_balanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatBDT(Math.abs(report.total_debit - report.total_credit))}
              </div>
            </div>
          </div>

          {/* Sectioned table */}
          {report.data.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
              <Scale className="mx-auto h-10 w-10 text-gray-400" />
              <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No entries in this period</div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Post a journal entry or widen the date range to populate the trial balance.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ACCOUNT_TYPES.map((type) => {
                const rows = grouped[type] ?? [];
                if (rows.length === 0) return null;
                const sub = typeSubtotal(rows);
                return (
                  <div
                    key={type}
                    className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <div
                      className={`flex items-center justify-between px-4 py-2 ${TYPE_BG[type]}`}
                    >
                      <span className={`text-sm font-semibold capitalize ${TYPE_COLORS[type]}`}>
                        {type}s ({rows.length})
                      </span>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-blue-600 dark:text-blue-400">DR {formatBDT(sub.debit)}</span>
                        <span className="text-red-600 dark:text-red-400">CR {formatBDT(sub.credit)}</span>
                      </div>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/40">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Code</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Account</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Debit</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Credit</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.map((r) => (
                          <tr key={r.account_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                              {r.code}
                            </td>
                            <td className="px-4 py-2 text-gray-900 dark:text-white">{r.name}</td>
                            <td className="px-4 py-2 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                              {r.total_debit > 0 ? formatBDT(r.total_debit) : '-'}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-xs text-red-600 dark:text-red-400">
                              {r.total_credit > 0 ? formatBDT(r.total_credit) : '-'}
                            </td>
                            <td
                              className={`px-4 py-2 text-right font-mono text-xs font-semibold ${
                                r.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {formatBDT(r.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Grand totals */}
              <div className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale size={18} className="text-gray-700 dark:text-gray-200" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Grand Total</span>
                </div>
                <div className="flex items-center gap-6 text-sm font-mono font-semibold">
                  <span className="text-blue-600 dark:text-blue-400">DR {formatBDT(report.total_debit)}</span>
                  <span className="text-red-600 dark:text-red-400">CR {formatBDT(report.total_credit)}</span>
                  <span
                    className={
                      report.is_balanced
                        ? 'text-green-600 dark:text-green-400 flex items-center gap-1'
                        : 'text-red-600 dark:text-red-400 flex items-center gap-1'
                    }
                  >
                    {report.is_balanced ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {report.is_balanced ? 'Balanced' : `Diff ${formatBDT(Math.abs(report.total_debit - report.total_credit))}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!report && !loading && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
          <Scale className="mx-auto h-10 w-10 text-gray-400" />
          <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No report generated</div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a date range and click <strong>Generate Report</strong> to load the trial balance.
          </p>
        </div>
      )}
    </div>
  );
}
