'use client';

import { useState } from 'react';
import { Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { notify } from '@/lib/notifications';
import accountService from '@/services/accountService';
import type { CashFlowReport } from '@/types/accounting.types';

export default function CashFlowPage() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CashFlowReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountService.cashFlow({ start_date: startDate, end_date: endDate });
      setReport(res.data?.data ?? null);
    } catch {
      notify.error('Failed to load cash flow report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cash Flow</h1>
        <p className="text-sm text-gray-500">Inflows and outflows across all cash & bank accounts</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
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
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle size={16} className="text-green-500" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Total Inflows</span>
              </div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 font-mono">
                ৳{report.inflows.toFixed(2)}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle size={16} className="text-red-500" />
                <span className="text-xs font-medium text-red-700 dark:text-red-400">Total Outflows</span>
              </div>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 font-mono">
                ৳{report.outflows.toFixed(2)}
              </p>
            </div>
            <div className={`rounded-lg border p-4 ${report.net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Net Cash Flow</span>
              </div>
              <p className={`text-xl font-bold font-mono ${report.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                {report.net < 0 ? '-' : ''}৳{Math.abs(report.net).toFixed(2)}
              </p>
            </div>
          </div>

          {/* By account breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 overflow-hidden">
            <div className="p-3 border-b dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">By Account</h3>
              <p className="text-xs text-gray-400">{report.start_date} to {report.end_date}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Account</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Inflows</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Outflows</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {report.by_account.map((acct, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-gray-500 mr-1">{acct.code}</span>
                      <span>{acct.name}</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-green-600 dark:text-green-400">
                      ৳{acct.inflows.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-red-500">
                      ৳{acct.outflows.toFixed(2)}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${acct.net < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                      ৳{acct.net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
