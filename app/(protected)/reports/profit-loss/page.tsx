'use client';

import { useState } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { notify } from '@/lib/notifications';
import accountService from '@/services/accountService';
import CustomDatePicker from '@/components/ui/date-picker';
import type { ProfitLossReport } from '@/types/accounting.types';

function AmountRow({ label, amount, bold, indent, color }: {
  label: string; amount: number; bold?: boolean; indent?: boolean; color?: string;
}) {
  return (
    <div className={`flex justify-between py-1.5 ${indent ? 'pl-6' : ''} ${bold ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${color ?? 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
      <span className={`font-mono text-sm ${color ?? (amount < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white')}`}>
        ৳{Math.abs(amount).toFixed(2)}{amount < 0 ? ' (loss)' : ''}
      </span>
    </div>
  );
}

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ProfitLossReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountService.profitLoss({ start_date: startDate, end_date: endDate });
      setReport(res);
    } catch {
      notify.error('Failed to load P&L report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profit & Loss</h1>
        <p className="text-sm text-gray-500">Income statement for the selected period</p>
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
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60"
        >
          <Search size={14} />
          {loading ? 'Loading…' : 'Generate Report'}
        </button>
      </div>

      {report && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-6 max-w-xl">
          <h2 className="text-center font-bold text-gray-900 dark:text-white mb-1">Profit & Loss Statement</h2>
          <p className="text-center text-xs text-gray-500 mb-4">{report.start_date} to {report.end_date}</p>

          {/* Revenue */}
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase text-green-600 dark:text-green-400 mb-1">Revenue</p>
            {report.sections.revenue.map((r, i) => (
              <AmountRow key={i} label={r.name} amount={r.amount} indent />
            ))}
            <AmountRow label="Total Revenue" amount={report.revenue} bold color="text-green-600 dark:text-green-400" />
          </div>

          {/* COGS */}
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400 mb-1">Cost of Goods Sold</p>
            {report.sections.cogs.map((r, i) => (
              <AmountRow key={i} label={r.name} amount={r.amount} indent />
            ))}
            <AmountRow label="Total COGS" amount={report.cogs} bold />
          </div>

          <AmountRow
            label="Gross Profit"
            amount={report.gross_profit}
            bold
            color={report.gross_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}
          />

          {/* Expenses */}
          <div className="mb-3 mt-3">
            <p className="text-xs font-semibold uppercase text-red-500 mb-1">Operating Expenses</p>
            {report.sections.expenses.map((r, i) => (
              <AmountRow key={i} label={r.name} amount={r.amount} indent />
            ))}
            <AmountRow label="Total Expenses" amount={report.expenses} bold />
          </div>

          <div className="flex justify-between pt-3">
            <span className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-1">
              {report.net_profit >= 0
                ? <TrendingUp size={16} className="text-green-500" />
                : <TrendingDown size={16} className="text-red-500" />}
              Net {report.net_profit >= 0 ? 'Profit' : 'Loss'}
            </span>
            <span className={`font-bold text-base font-mono ${report.net_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              ৳{Math.abs(report.net_profit).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
