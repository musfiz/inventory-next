'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { notify } from '@/lib/notifications';
import accountService from '@/services/accountService';
import CustomDatePicker from '@/components/ui/date-picker';
import TenantSelect from '@/components/ui/tenant-select';
import type { LedgerLine, Account } from '@/types/accounting.types';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

export default function LedgerPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountOptions, setAccountOptions] = useState<Account[]>([]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<{ account: Account; opening_balance: number; lines: { data: LedgerLine[] } } | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const searchAccounts = async (q: string) => {
    setAccountQuery(q);
    if (q.length < 1) { setAccountOptions([]); return; }
    try {
      const params: Record<string, unknown> = { search: q, per_page: 20 };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await accountService.list(params);
      setAccountOptions(res.data ?? []);
    } catch { /* ignore */ }
  };

  const loadLedger = async () => {
    if (!selectedAccount) { notify.error('Select an account first'); return; }
    setLoading(true);
    try {
      const params: { start_date: string; end_date: string; tenant_id?: string } = { start_date: startDate, end_date: endDate };
      const tenantId = isSuperAdmin ? selectedTenantId : authUser?.tenant_id;
      if (tenantId) params.tenant_id = tenantId;
      const res = await accountService.ledger(selectedAccount.id, params);
      setLedgerData(res);
    } catch {
      notify.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const lines: LedgerLine[] = ledgerData?.lines?.data ?? [];
  const openingBalance = ledgerData?.opening_balance ?? 0;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account Ledger</h1>
        <p className="text-sm text-gray-500">View transaction history for any account</p>
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
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search account by code or name…"
              value={selectedAccount ? `${selectedAccount.code} – ${selectedAccount.name}` : accountQuery}
              onChange={e => { setSelectedAccount(null); searchAccounts(e.target.value); }}
              className="w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            {accountOptions.length > 0 && !selectedAccount && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg mt-0.5">
                {accountOptions.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setSelectedAccount(a); setAccountOptions([]); setAccountQuery(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className="font-mono text-xs text-gray-500">{a.code}</span> {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
          onClick={loadLedger}
          disabled={loading || !selectedAccount}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-60"
        >
          <Search size={14} />
          {loading ? 'Loading…' : 'View Ledger'}
        </button>
      </div>

      {/* Ledger Table */}
      {ledgerData && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 overflow-hidden">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {ledgerData.account.code} – {ledgerData.account.name}
            </h2>
            <p className="text-xs text-gray-500">{startDate} to {endDate}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Entry #</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Debit</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Credit</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <td colSpan={5} className="px-4 py-2 text-xs text-gray-500 italic">Opening Balance</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">৳{openingBalance.toFixed(2)}</td>
              </tr>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No transactions in this period</td>
                </tr>
              ) : (
                lines.map((line, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2 text-xs">{line.journal_entry?.entry_date?.slice(0, 10)}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{line.journal_entry?.entry_number}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
                      {line.description ?? line.journal_entry?.description ?? '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {Number(line.debit) > 0 ? `৳${Number(line.debit).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {Number(line.credit) > 0 ? `৳${Number(line.credit).toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-xs font-semibold ${Number(line.running_balance) < 0 ? 'text-red-600' : ''}`}>
                      ৳{Number(line.running_balance).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
